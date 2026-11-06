import { describe, expect, it } from "vitest";
import { availableBalance, postedBalance } from "@/lib/ledger/balance";
import { WIRE_FEE } from "@/lib/domain/fedwire";
import { cancelWire, completeWire, failWire, internalTransfer, markWireProcessing, submitWire, type WireAccount, type WireEntry, type WireRecord } from "./apply";

const NOW = new Date("2026-11-05T15:30:00Z");
const ACTOR = "user_1";

const accounts: WireAccount[] = [
  { id: "checking", userId: ACTOR, kind: "checking" },
  { id: "savings", userId: ACTOR, kind: "savings" },
  { id: "credit", userId: ACTOR, kind: "credit" },
  { id: "other", userId: "user_2", kind: "checking" },
];

function cash(accountId: string, amount: number): WireEntry {
  return {
    id: `open_${accountId}`,
    userId: ACTOR,
    accountId,
    wireId: null,
    amount,
    direction: "credit",
    status: "posted",
    postedAt: "2026-01-01T00:00:00Z",
    description: "Opening",
    counterparty: "Oakey",
    category: "Transfers",
    type: "internal",
  };
}

const opening = [cash("checking", 100_000), cash("savings", 50_000)];

const recipient = { id: "rcp_1", userId: ACTOR, name: "Studio Marrow LLC", routingNumber: "021000021" };

function submit(extra: Partial<Parameters<typeof submitWire>[0]> = {}) {
  return submitWire({
    actorId: ACTOR,
    accounts,
    entries: opening,
    recipient,
    fromAccountId: "checking",
    amount: 20_000,
    memo: "Invoice",
    purpose: "Vendor payment",
    idempotencyKey: "idem_1",
    wireId: "wire_1",
    principalEntryId: "ent_p",
    feeEntryId: "ent_f",
    now: NOW,
    ...extra,
  });
}

describe("submitWire", () => {
  it("locks the ledger for the amount and the fee and leaves posted cash unchanged", () => {
    const result = submit();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.wire.status).toBe("pending");
    expect(result.data.wire.fee).toBe(WIRE_FEE);
    expect(result.data.wire.ledgerLockedAt).toBe(NOW.toISOString());
    expect(result.data.wire.abaCheckedAt).toBe(NOW.toISOString());
    expect(result.data.wire.fedwireSentAt).toBeNull();
    const next = [...opening, ...result.data.entries];
    expect(postedBalance(next, "checking")).toBe(100_000);
    expect(availableBalance(next, "checking")).toBe(100_000 - 20_000 - WIRE_FEE);
    expect(result.data.entries.every((entry) => Number.isInteger(entry.amount) && entry.amount > 0)).toBe(true);
  });

  it("rejects another user's account, a bad ABA, a credit card, and an overdraft", () => {
    expect(submit({ fromAccountId: "other" }).ok).toBe(false);
    expect(submit({ recipient: { ...recipient, userId: "user_2" } }).ok).toBe(false);
    expect(submit({ recipient: { ...recipient, routingNumber: "123456789" } }).ok).toBe(false);
    expect(submit({ fromAccountId: "credit" }).ok).toBe(false);
    expect(submit({ amount: 200_000 }).ok).toBe(false);
    expect(submit({ actorId: "" }).ok).toBe(false);
  });
});

describe("wire lifecycle", () => {
  const created = submit();
  if (!created.ok) throw new Error("fixture");
  const entries = [...opening, ...created.data.entries];
  const wire = created.data.wire;

  it("cancels a pending wire and releases the hold", () => {
    const canceled = cancelWire(ACTOR, wire, entries, NOW);
    expect(canceled.ok).toBe(true);
    if (!canceled.ok) return;
    expect(canceled.data.wire.status).toBe("canceled");
    expect(canceled.data.voidedEntryIds).toEqual(["ent_p", "ent_f"]);
    const released = entries.map((entry) => (canceled.data.voidedEntryIds.includes(entry.id) ? { ...entry, status: "void" as const } : entry));
    expect(availableBalance(released, "checking")).toBe(100_000);
  });

  it("refuses to cancel once Fedwire has the wire", () => {
    const processing = markWireProcessing(ACTOR, wire, NOW);
    expect(processing.ok).toBe(true);
    if (!processing.ok) return;
    expect(processing.data.fedwireSentAt).toBe(NOW.toISOString());
    expect(cancelWire(ACTOR, processing.data, entries, NOW).ok).toBe(false);
    const done = completeWire(ACTOR, processing.data, entries, NOW);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    const posted = entries.map((entry) => (done.data.postedEntryIds.includes(entry.id) ? { ...entry, status: "posted" as const } : entry));
    expect(postedBalance(posted, "checking")).toBe(100_000 - 20_000 - WIRE_FEE);
    expect(completeWire(ACTOR, done.data.wire, posted, NOW).ok).toBe(false);
  });

  it("fails a pending wire without posting the debit", () => {
    const failed = failWire(ACTOR, wire, entries, NOW);
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failed.data.wire.status).toBe("failed");
    expect(failed.data.voidedEntryIds).toHaveLength(2);
    expect(failWire(ACTOR, failed.data.wire, entries, NOW).ok).toBe(false);
  });

  it("hides a wire the actor does not own", () => {
    expect(cancelWire("user_2", wire, entries, NOW).ok).toBe(false);
    expect(markWireProcessing("user_2", wire, NOW).ok).toBe(false);
    expect(completeWire(ACTOR, undefined, entries, NOW).ok).toBe(false);
  });
});

describe("internalTransfer", () => {
  it("posts a matching pair and refuses a stranger or an overdraft", () => {
    const moved = internalTransfer({
      actorId: ACTOR,
      accounts,
      entries: opening,
      fromAccountId: "checking",
      toAccountId: "savings",
      amount: 4_000,
      debitId: "d1",
      creditId: "c1",
      now: NOW,
    });
    expect(moved.ok).toBe(true);
    if (!moved.ok) return;
    const next = [...opening, ...moved.data];
    expect(postedBalance(next, "checking")).toBe(96_000);
    expect(postedBalance(next, "savings")).toBe(54_000);
    expect(moved.data[0]?.amount).toBe(moved.data[1]?.amount);
    expect(internalTransfer({ actorId: ACTOR, accounts, entries: opening, fromAccountId: "checking", toAccountId: "checking", amount: 1, debitId: "d", creditId: "c", now: NOW }).ok).toBe(false);
    expect(internalTransfer({ actorId: ACTOR, accounts, entries: opening, fromAccountId: "other", toAccountId: "savings", amount: 1, debitId: "d", creditId: "c", now: NOW }).ok).toBe(false);
    expect(internalTransfer({ actorId: ACTOR, accounts, entries: opening, fromAccountId: "checking", toAccountId: "savings", amount: 500_000, debitId: "d", creditId: "c", now: NOW }).ok).toBe(false);
  });
});

describe("wire record shape", () => {
  it("stores no balance of its own", () => {
    const result = submit();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.wire).not.toHaveProperty("balance");
    const record: WireRecord = result.data.wire;
    expect(record.amount).toBe(20_000);
  });
});
