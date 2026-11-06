export const MOVEMENT_LIMIT = 10;

export type IdempotencyDecision = "proceed" | "replay" | "conflict";

/** Same key and same body replays. Same key and a different body conflicts. */
export function idempotencyDecision(existing: { requestHash: string } | null, requestHash: string): IdempotencyDecision {
  if (!existing) return "proceed";
  return existing.requestHash === requestHash ? "replay" : "conflict";
}

/** Fixed window. `countInWindow` is the number already recorded in the open window. */
export function rateLimitAllows(countInWindow: number, limit = MOVEMENT_LIMIT): boolean {
  return countInWindow < limit;
}
