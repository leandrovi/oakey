import type { EntryDirection, EntryStatus } from "@/lib/ledger/balance";
import { availableBalance } from "@/lib/ledger/balance";
import type { WireAccount, WireEntry, WireResult } from "@/lib/wires/apply";

export interface PaymentInput {
  actorId: string;
  accounts: readonly WireAccount[];
  entries: readonly WireEntry[];
  fromAccountId: string;
  amount: number;
  debitId: string;
  creditId?: string;
  creditAccountId?: string;
  description: string;
  counterparty: string;
  category: string;
  type: string;
  now: Date;
}

function fail(message: string): WireResult<never> {
  return { ok: false, message };
}

/** Money leaves checking. A card payment also credits the credit account for the same cents. */
export function postPayment(input: PaymentInput): WireResult<WireEntry[]> {
  if (!input.actorId) return fail("Sign in to continue.");
  const from = input.accounts.find((account) => account.id === input.fromAccountId);
  if (!from || from.userId !== input.actorId || from.kind === "credit") return fail("That account isn't yours.");
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) return fail("Enter an amount in cents.");
  if (availableBalance(input.entries, from.id) < input.amount) return fail("Available balance doesn't cover that payment.");
  const stamp = input.now.toISOString();
  const debit: WireEntry = {
    id: input.debitId,
    userId: input.actorId,
    accountId: from.id,
    wireId: null,
    postedAt: stamp,
    description: input.description,
    counterparty: input.counterparty,
    category: input.category,
    type: input.type,
    direction: "debit" satisfies EntryDirection,
    amount: input.amount,
    status: "posted" satisfies EntryStatus,
  };
  if (!input.creditAccountId || !input.creditId) return { ok: true, data: [debit] };
  const creditAccount = input.accounts.find((account) => account.id === input.creditAccountId);
  if (!creditAccount || creditAccount.userId !== input.actorId) return fail("That account isn't yours.");
  const credit: WireEntry = {
    ...debit,
    id: input.creditId,
    accountId: creditAccount.id,
    direction: "credit",
    description: `Payment from ${from.kind === "savings" ? "Savings" : "Checking"}`,
  };
  return { ok: true, data: [debit, credit] };
}
