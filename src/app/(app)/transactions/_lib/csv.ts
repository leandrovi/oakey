import type { AccountId, CardId, Transaction } from "@/lib/domain/types";

/** Quotes a CSV field only when it needs it, doubling any embedded quotes per RFC 4180. */
export function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function toCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(",");
}

/** Dollar amount with exactly two decimals, negative for debits. Never a currency symbol: this is a data export. */
export function signedDollarAmount(t: Transaction): string {
  const signed = t.direction === "debit" ? -t.amount : t.amount;
  return (signed / 100).toFixed(2);
}

const CSV_HEADERS = ["Date", "Description", "Counterparty", "Category", "Type", "Status", "Account", "Amount", "Balance after", "Reference ID"];

export function transactionsToCsv(transactions: Transaction[], accountNames: Map<AccountId | CardId, string>): string {
  const rows = transactions.map((t) =>
    toCsvRow([
      t.postedAt.slice(0, 10),
      t.description,
      t.counterparty,
      t.category,
      t.type,
      t.status,
      accountNames.get(t.accountId) ?? t.accountId,
      signedDollarAmount(t),
      t.balanceAfter != null ? (t.balanceAfter / 100).toFixed(2) : "",
      t.id,
    ]),
  );
  return [toCsvRow(CSV_HEADERS), ...rows].join("\r\n");
}
