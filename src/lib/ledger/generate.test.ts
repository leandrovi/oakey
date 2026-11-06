import { describe, expect, it } from "vitest";
import { availableBalance, owedBalance, postedBalance } from "@/lib/ledger/balance";
import { BOOK_AS_OF, generateBook, seedFromUserId, type BookProfile } from "@/lib/ledger/generate";

const profile: BookProfile = {
  userId: "user_ada",
  email: "ada@analytical.example",
  firstName: "Ada",
  lastName: "Lovelace",
  businessName: "Analytical Engines",
};

describe("generateBook", () => {
  it("builds the same book for the same user and a different book for someone else", () => {
    expect(generateBook(profile)).toEqual(generateBook(profile));
    expect(seedFromUserId(profile.userId)).not.toBe(seedFromUserId("user_other"));
    expect(generateBook(profile).accounts[0]?.id).not.toBe(generateBook({ ...profile, userId: "user_other" }).accounts[0]?.id);
  });

  it("keeps money in positive integer cents and never stores a balance", () => {
    const book = generateBook(profile);
    expect(book.accounts.every((account) => !("balance" in account))).toBe(true);
    expect(book.entries.every((entry) => Number.isSafeInteger(entry.amount) && entry.amount > 0)).toBe(true);
    const start = new Date(Date.UTC(BOOK_AS_OF.getUTCFullYear(), BOOK_AS_OF.getUTCMonth() - 11, 1));
    expect(book.entries.every((entry) => new Date(entry.postedAt) >= start && new Date(entry.postedAt) <= BOOK_AS_OF)).toBe(true);
  });

  it("derives checking, savings, and card positions from the entries", () => {
    const book = generateBook(profile);
    const checking = book.accounts.find((account) => account.kind === "checking");
    const savings = book.accounts.find((account) => account.kind === "savings");
    const credit = book.accounts.find((account) => account.kind === "credit");
    expect(checking && savings && credit).toBeTruthy();
    expect(postedBalance(book.entries, checking!.id) - availableBalance(book.entries, checking!.id)).toBe(1_250_000 + 1_500);
    expect(postedBalance(book.entries, savings!.id)).toBeGreaterThan(0);
    expect(owedBalance(book.entries, credit!.id)).toBeGreaterThan(0);
    expect(book.wires.find((wire) => wire.status === "pending")?.fee).toBe(1_500);
  });
});
