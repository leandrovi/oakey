export type EntryStatus = "pending" | "posted" | "void" | "failed";
export type EntryDirection = "credit" | "debit";

export interface BalanceEntry {
  accountId: string;
  amount: number;
  direction: EntryDirection;
  status: EntryStatus;
}

export function signedAmount(entry: Pick<BalanceEntry, "amount" | "direction">): number {
  return entry.direction === "credit" ? entry.amount : -entry.amount;
}

/** Posted entries only. Pending holds do not change posted cash. */
export function postedBalance(entries: readonly BalanceEntry[], accountId: string): number {
  return entries
    .filter((entry) => entry.accountId === accountId && entry.status === "posted")
    .reduce((sum, entry) => sum + signedAmount(entry), 0);
}

/**
 * Posted cash minus pending debits. A wire hold reduces what can be spent
 * before the wire posts. Pending credits do not count.
 */
export function availableBalance(entries: readonly BalanceEntry[], accountId: string): number {
  return entries
    .filter(
      (entry) =>
        entry.accountId === accountId &&
        (entry.status === "posted" || (entry.status === "pending" && entry.direction === "debit")),
    )
    .reduce((sum, entry) => sum + signedAmount(entry), 0);
}

/** What a credit account owes: posted net plus pending charges. Zero stays zero, not -0. */
export function owedBalance(entries: readonly BalanceEntry[], accountId: string): number {
  return 0 - availableBalance(entries, accountId);
}
