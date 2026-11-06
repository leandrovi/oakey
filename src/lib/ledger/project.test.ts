import { describe, expect, it } from "vitest";
import { availableBalance, owedBalance } from "@/lib/ledger/balance";
import { generateBook, type BookProfile } from "@/lib/ledger/generate";
import { projectBook } from "@/lib/ledger/project";

const profile: BookProfile & { createdAt: string } = {
  userId: "user_ada",
  email: "ada@analytical.example",
  firstName: "Ada",
  lastName: "Lovelace",
  businessName: "Analytical Engines",
  createdAt: "2026-11-05T20:30:00.000Z",
};

describe("projectBook", () => {
  it("shows available cash and card debt folded from the ledger", () => {
    const book = generateBook(profile);
    const view = projectBook(profile, book);
    for (const account of view.accounts) {
      expect(account.balance).toBe(availableBalance(book.entries, account.id));
    }
    const credit = book.accounts.find((account) => account.kind === "credit");
    expect(view.creditCard.balance).toBe(owedBalance(book.entries, credit!.id));
    expect(view.transactions.some((txn) => txn.accountId === view.cards[0]?.id)).toBe(true);
    const posted = view.transactions.filter((txn) => txn.status === "posted" && view.accounts.some((account) => account.id === txn.accountId));
    expect(posted.every((txn) => txn.balanceAfter != null)).toBe(true);
  });
});
