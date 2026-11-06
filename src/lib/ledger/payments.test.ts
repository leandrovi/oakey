import { describe, expect, it } from "vitest";
import { availableBalance, owedBalance } from "@/lib/ledger/balance";
import { postPayment } from "@/lib/ledger/payments";
import type { WireAccount, WireEntry } from "@/lib/wires/apply";

const accounts: WireAccount[] = [
  { id: "chk", userId: "user_1", kind: "checking" },
  { id: "crd", userId: "user_1", kind: "credit" },
  { id: "other", userId: "user_2", kind: "checking" },
];

const opening: WireEntry = {
  id: "open",
  userId: "user_1",
  accountId: "chk",
  wireId: null,
  postedAt: "2026-01-01T00:00:00.000Z",
  description: "Opening",
  counterparty: "Oakey",
  category: "Transfers",
  type: "internal",
  direction: "credit",
  amount: 50_000,
  status: "posted",
};

const charge: WireEntry = {
  ...opening,
  id: "charge",
  accountId: "crd",
  direction: "debit",
  amount: 8_000,
  type: "card",
  category: "Software",
  description: "Figma",
  counterparty: "Figma",
};

describe("postPayment", () => {
  it("debits checking and credits the card for the same cents", () => {
    const result = postPayment({
      actorId: "user_1",
      accounts,
      entries: [opening, charge],
      fromAccountId: "chk",
      creditAccountId: "crd",
      creditId: "pay_c",
      amount: 8_000,
      debitId: "pay_d",
      description: "Card payment",
      counterparty: "Oakey Card",
      category: "Transfers",
      type: "internal",
      now: new Date("2026-11-05T20:00:00Z"),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const entries = [opening, charge, ...result.data];
    expect(availableBalance(entries, "chk")).toBe(42_000);
    expect(owedBalance(entries, "crd")).toBe(0);
    expect(result.data.every((entry) => Number.isSafeInteger(entry.amount))).toBe(true);
  });

  it("refuses another person's account and an overdraft", () => {
    expect(postPayment({
      actorId: "user_1",
      accounts,
      entries: [opening],
      fromAccountId: "other",
      amount: 100,
      debitId: "x",
      description: "Loan",
      counterparty: "Oakey",
      category: "Loan",
      type: "loan",
      now: new Date(),
    }).ok).toBe(false);
    expect(postPayment({
      actorId: "user_1",
      accounts,
      entries: [opening],
      fromAccountId: "chk",
      amount: 80_000,
      debitId: "x",
      description: "Loan",
      counterparty: "Oakey",
      category: "Loan",
      type: "loan",
      now: new Date(),
    }).ok).toBe(false);
  });
});
