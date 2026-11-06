import { and, eq, sql } from "drizzle-orm";
import { idempotencyDecision, MOVEMENT_LIMIT, rateLimitAllows } from "@/lib/ledger/guards";
import { requestHash } from "@/lib/ledger/hash";
import { database, type Tx } from "@/server/db";
import { idempotencyKeys, rateLimits } from "@/server/schema";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

const WINDOW_MS = 60_000;

/** One money movement: owner lock, idempotency, then the per-minute cap. */
export async function withMovement<T>(userId: string, scope: string, key: string, payload: unknown, run: (tx: Tx) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  const hash = requestHash(payload);
  return database().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
    const existing = await tx
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, userId), eq(idempotencyKeys.scope, scope), eq(idempotencyKeys.key, key)))
      .limit(1);
    const prior = existing[0];
    const decision = idempotencyDecision(prior ? { requestHash: prior.requestHash } : null, hash);
    if (decision === "replay") return prior.response as ActionResult<T>;
    if (decision === "conflict") return { ok: false, message: "This request was already sent with different details." };
    const windowStart = String(Math.floor(Date.now() / WINDOW_MS));
    const rate = await tx
      .select()
      .from(rateLimits)
      .where(and(eq(rateLimits.userId, userId), eq(rateLimits.bucket, "movement"), eq(rateLimits.windowStart, windowStart)))
      .limit(1);
    if (!rateLimitAllows(rate[0]?.count ?? 0, MOVEMENT_LIMIT)) {
      return { ok: false, message: "Too many moves. Wait a minute and try again." };
    }
    const result = await run(tx);
    if (!result.ok) return result;
    await tx.insert(idempotencyKeys).values({
      id: crypto.randomUUID(),
      userId,
      scope,
      key,
      requestHash: hash,
      response: result,
      createdAt: new Date().toISOString(),
    });
    if (rate[0]) {
      await tx
        .update(rateLimits)
        .set({ count: rate[0].count + 1 })
        .where(and(eq(rateLimits.userId, userId), eq(rateLimits.bucket, "movement"), eq(rateLimits.windowStart, windowStart)));
    } else {
      await tx.insert(rateLimits).values({ userId, bucket: "movement", windowStart, count: 1 });
    }
    return result;
  });
}
