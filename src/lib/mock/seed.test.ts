import { describe, expect, it, vi } from "vitest";
import { CHECKING_ID, NOW, SAVINGS_ID, accounts, transactions } from "./seed";

const TWELVE_MONTHS_AGO = (() => {
  const d = new Date(NOW);
  d.setUTCMonth(d.getUTCMonth() - 12);
  return d;
})();

describe("seed ledger invariants", () => {
  it("every transaction amount is a positive integer", () => {
    for (const t of transactions) {
      expect(Number.isInteger(t.amount)).toBe(true);
      expect(t.amount).toBeGreaterThan(0);
    }
  });

  it("every transaction id is unique", () => {
    const ids = transactions.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("no transaction is dated after NOW", () => {
    for (const t of transactions) {
      expect(new Date(t.postedAt).getTime()).toBeLessThanOrEqual(NOW.getTime());
    }
  });

  it("no transaction is dated more than 12 months before NOW", () => {
    for (const t of transactions) {
      expect(new Date(t.postedAt).getTime()).toBeGreaterThanOrEqual(TWELVE_MONTHS_AGO.getTime());
    }
  });

  for (const accountId of [CHECKING_ID, SAVINGS_ID]) {
    it(`consecutive posted balances on ${accountId} differ by exactly the signed entry amount`, () => {
      // Transactions are stored most-recent-first; walk oldest to newest.
      const posted = transactions
        .filter((t) => t.accountId === accountId && t.status === "posted")
        .slice()
        .reverse();
      expect(posted.length).toBeGreaterThan(0);
      for (let i = 1; i < posted.length; i++) {
        const prev = posted[i - 1]!;
        const curr = posted[i]!;
        const signed = curr.direction === "credit" ? curr.amount : -curr.amount;
        expect(curr.balanceAfter! - prev.balanceAfter!).toBe(signed);
      }
    });

    it(`the account's current balance matches the latest posted entry's balanceAfter on ${accountId}`, () => {
      const posted = transactions.filter((t) => t.accountId === accountId && t.status === "posted");
      const latest = posted.reduce((a, b) => (new Date(a.postedAt) > new Date(b.postedAt) ? a : b));
      const account = accounts.find((a) => a.id === accountId)!;
      expect(account.balance).toBe(latest.balanceAfter);
    });
  }

  it("every internal transfer to savings has a matching same-day, same-amount credit on savings", () => {
    const debitsFromChecking = transactions.filter(
      (t) => t.accountId === CHECKING_ID && t.type === "internal" && t.direction === "debit" && t.counterparty.includes("Savings"),
    );
    expect(debitsFromChecking.length).toBeGreaterThan(0);
    const creditsToSavings = transactions.filter((t) => t.accountId === SAVINGS_ID && t.type === "internal" && t.direction === "credit");
    for (const debit of debitsFromChecking) {
      const debitDay = debit.postedAt.slice(0, 10);
      const match = creditsToSavings.find((c) => c.postedAt.slice(0, 10) === debitDay && c.amount === debit.amount);
      expect(match, `no matching savings credit for checking debit on ${debitDay} of ${debit.amount}`).toBeDefined();
    }
  });

  it("is deterministic across re-imports", async () => {
    vi.resetModules();
    const reimported = await import("./seed");
    expect(reimported.transactions.length).toBe(transactions.length);
    expect(reimported.transactions.map((t) => t.id)).toEqual(transactions.map((t) => t.id));
    expect(reimported.transactions.map((t) => t.amount)).toEqual(transactions.map((t) => t.amount));
    expect(reimported.transactions.map((t) => t.postedAt)).toEqual(transactions.map((t) => t.postedAt));
    expect(reimported.accounts.map((a) => a.balance)).toEqual(accounts.map((a) => a.balance));
  });
});
