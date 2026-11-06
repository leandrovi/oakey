import { describe, expect, it } from "vitest";
import { availableBalance, owedBalance, postedBalance, type BalanceEntry } from "./balance";

function entry(partial: Partial<BalanceEntry> & Pick<BalanceEntry, "amount" | "direction" | "status">): BalanceEntry {
  return { accountId: "checking", ...partial };
}

describe("ledger balances", () => {
  const entries: BalanceEntry[] = [
    entry({ amount: 10_000, direction: "credit", status: "posted" }),
    entry({ amount: 2_500, direction: "debit", status: "posted" }),
    entry({ amount: 1_000, direction: "debit", status: "pending" }),
    entry({ amount: 400, direction: "credit", status: "pending" }),
    entry({ amount: 50, direction: "debit", status: "void" }),
    entry({ accountId: "savings", amount: 5_000, direction: "credit", status: "posted" }),
  ];

  it("posted balance ignores holds, voids, and other accounts", () => {
    expect(postedBalance(entries, "checking")).toBe(7_500);
    expect(postedBalance(entries, "savings")).toBe(5_000);
    expect(postedBalance(entries, "missing")).toBe(0);
  });

  it("available balance subtracts pending debits and ignores pending credits", () => {
    expect(availableBalance(entries, "checking")).toBe(6_500);
  });

  it("a credit account owes the opposite of available cash", () => {
    const card: BalanceEntry[] = [
      entry({ accountId: "credit", amount: 8_000, direction: "debit", status: "posted" }),
      entry({ accountId: "credit", amount: 3_000, direction: "credit", status: "posted" }),
      entry({ accountId: "credit", amount: 500, direction: "debit", status: "pending" }),
    ];
    expect(owedBalance(card, "credit")).toBe(5_500);
    expect(owedBalance(card, "credit")).toBe(-availableBalance(card, "credit"));
  });
});
