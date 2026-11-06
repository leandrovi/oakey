import { parseRoutingNumber } from "@/lib/domain/aba";
import { WIRE_FEE, wireSettlementDate } from "@/lib/domain/fedwire";
import { canTransition } from "@/lib/domain/wire";
import type { IsoDate, IsoDateTime, WireStatus } from "@/lib/domain/types";
import { availableBalance, type BalanceEntry, type EntryDirection, type EntryStatus } from "@/lib/ledger/balance";

export interface WireAccount {
  id: string;
  userId: string;
  kind: "checking" | "savings" | "credit";
}

export interface WireEntry extends BalanceEntry {
  id: string;
  userId: string;
  wireId: string | null;
  postedAt: string;
  description: string;
  counterparty: string;
  category: string;
  type: string;
}

export interface WireRecord {
  id: string;
  userId: string;
  idempotencyKey: string;
  fromAccountId: string;
  recipientId: string;
  amount: number;
  fee: number;
  memo: string;
  purpose: string;
  status: WireStatus;
  createdAt: IsoDateTime;
  expectedSettlementDate: IsoDate;
  ledgerLockedAt: IsoDateTime | null;
  abaCheckedAt: IsoDateTime | null;
  fedwireSentAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  failedAt: IsoDateTime | null;
}

export type WireResult<T> = { ok: true; data: T } | { ok: false; message: string };

export interface SubmitWireInput {
  actorId: string;
  accounts: readonly WireAccount[];
  entries: readonly WireEntry[];
  recipient: { id: string; userId: string; name: string; routingNumber: string };
  fromAccountId: string;
  amount: number;
  memo: string;
  purpose: string;
  idempotencyKey: string;
  wireId: string;
  principalEntryId: string;
  feeEntryId: string;
  now: Date;
}

function iso(date: Date): IsoDateTime {
  return date.toISOString() as IsoDateTime;
}

function fail(message: string): WireResult<never> {
  return { ok: false, message };
}

function owns(actorId: string, ownerId: string): boolean {
  return actorId.length > 0 && actorId === ownerId;
}

function hold(input: SubmitWireInput, id: string, amount: number, description: string): WireEntry {
  return {
    id,
    userId: input.actorId,
    accountId: input.fromAccountId,
    wireId: input.wireId,
    amount,
    direction: "debit",
    status: "pending",
    postedAt: iso(input.now),
    description,
    counterparty: input.recipient.name,
    category: amount === input.amount ? "Transfers" : "Fees",
    type: amount === input.amount ? "wire" : "fee",
  };
}

export function submitWire(input: SubmitWireInput): WireResult<{ wire: WireRecord; entries: WireEntry[] }> {
  const account = input.accounts.find((row) => row.id === input.fromAccountId);
  if (!account || !owns(input.actorId, account.userId)) return fail("That account isn't yours.");
  if (account.kind === "credit") return fail("Wires leave a checking or savings account.");
  if (!owns(input.actorId, input.recipient.userId)) return fail("That recipient isn't yours.");
  if (!parseRoutingNumber(input.recipient.routingNumber)) return fail("The routing number doesn't pass the ABA checksum.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return fail("Enter an amount in cents.");
  const total = input.amount + WIRE_FEE;
  if (availableBalance(input.entries, account.id) < total) return fail("Available balance doesn't cover the wire and the fee.");

  const settlement = wireSettlementDate(input.now);
  const stamp = iso(input.now);
  const wire: WireRecord = {
    id: input.wireId,
    userId: input.actorId,
    idempotencyKey: input.idempotencyKey,
    fromAccountId: account.id,
    recipientId: input.recipient.id,
    amount: input.amount,
    fee: WIRE_FEE,
    memo: input.memo,
    purpose: input.purpose,
    status: "pending",
    createdAt: stamp,
    expectedSettlementDate: settlement.date,
    ledgerLockedAt: stamp,
    abaCheckedAt: stamp,
    fedwireSentAt: null,
    completedAt: null,
    failedAt: null,
  };
  return {
    ok: true,
    data: {
      wire,
      entries: [hold(input, input.principalEntryId, input.amount, `Wire to ${input.recipient.name}`), hold(input, input.feeEntryId, WIRE_FEE, "Wire fee")],
    },
  };
}

function ownedWire(actorId: string, wire: WireRecord | undefined): WireResult<WireRecord> {
  if (!wire || !owns(actorId, wire.userId)) return fail("That wire isn't yours.");
  return { ok: true, data: wire };
}

export function cancelWire(actorId: string, wire: WireRecord | undefined, entries: readonly WireEntry[], now: Date): WireResult<{ wire: WireRecord; voidedEntryIds: string[] }> {
  const owned = ownedWire(actorId, wire);
  if (!owned.ok) return owned;
  if (!canTransition(owned.data.status, "canceled")) return fail("This wire can no longer be canceled.");
  const voided = entries.filter((entry) => entry.wireId === owned.data.id && entry.status === "pending");
  return {
    ok: true,
    data: {
      wire: { ...owned.data, status: "canceled", failedAt: iso(now) },
      voidedEntryIds: voided.map((entry) => entry.id),
    },
  };
}

export function markWireProcessing(actorId: string, wire: WireRecord | undefined, now: Date): WireResult<WireRecord> {
  const owned = ownedWire(actorId, wire);
  if (!owned.ok) return owned;
  if (!canTransition(owned.data.status, "processing")) return fail("This wire isn't waiting to send.");
  return { ok: true, data: { ...owned.data, status: "processing", fedwireSentAt: iso(now) } };
}

export function completeWire(actorId: string, wire: WireRecord | undefined, entries: readonly WireEntry[], now: Date): WireResult<{ wire: WireRecord; postedEntryIds: string[] }> {
  const owned = ownedWire(actorId, wire);
  if (!owned.ok) return owned;
  if (!canTransition(owned.data.status, "completed")) return fail("This wire isn't in flight.");
  const posted = entries.filter((entry) => entry.wireId === owned.data.id && entry.status === "pending");
  return {
    ok: true,
    data: {
      wire: { ...owned.data, status: "completed", completedAt: iso(now) },
      postedEntryIds: posted.map((entry) => entry.id),
    },
  };
}

export function failWire(actorId: string, wire: WireRecord | undefined, entries: readonly WireEntry[], now: Date): WireResult<{ wire: WireRecord; voidedEntryIds: string[] }> {
  const owned = ownedWire(actorId, wire);
  if (!owned.ok) return owned;
  if (!canTransition(owned.data.status, "failed")) return fail("This wire has already finished.");
  const voided = entries.filter((entry) => entry.wireId === owned.data.id && entry.status === "pending");
  return {
    ok: true,
    data: {
      wire: { ...owned.data, status: "failed", failedAt: iso(now) },
      voidedEntryIds: voided.map((entry) => entry.id),
    },
  };
}

export interface TransferInput {
  actorId: string;
  accounts: readonly WireAccount[];
  entries: readonly WireEntry[];
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  debitId: string;
  creditId: string;
  now: Date;
}

export function internalTransfer(input: TransferInput): WireResult<WireEntry[]> {
  if (input.fromAccountId === input.toAccountId) return fail("Choose two different accounts.");
  const from = input.accounts.find((row) => row.id === input.fromAccountId);
  const to = input.accounts.find((row) => row.id === input.toAccountId);
  if (!from || !to || !owns(input.actorId, from.userId) || !owns(input.actorId, to.userId)) return fail("Those accounts aren't yours.");
  if (from.kind === "credit" || to.kind === "credit") return fail("Move money between checking and savings.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return fail("Enter an amount in cents.");
  if (availableBalance(input.entries, from.id) < input.amount) return fail("Available balance doesn't cover that transfer.");
  const stamp = iso(input.now);
  const base = {
    userId: input.actorId,
    wireId: null,
    postedAt: stamp,
    category: "Transfers",
    type: "internal",
    status: "posted" as EntryStatus,
    amount: input.amount,
  };
  return {
    ok: true,
    data: [
      { ...base, id: input.debitId, accountId: from.id, direction: "debit" as EntryDirection, description: `Transfer to ${to.kind === "savings" ? "Savings" : "Checking"}`, counterparty: to.kind === "savings" ? "Oakey Savings" : "Oakey Checking" },
      { ...base, id: input.creditId, accountId: to.id, direction: "credit" as EntryDirection, description: `Transfer from ${from.kind === "savings" ? "Savings" : "Checking"}`, counterparty: from.kind === "savings" ? "Oakey Savings" : "Oakey Checking" },
    ],
  };
}
