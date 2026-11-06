import { describe, expect, it } from "vitest";
import type { AccountId, Transaction } from "@/lib/domain/types";
import { escapeCsvField, signedDollarAmount, transactionsToCsv } from "./csv";

const CHECKING = "acc_chk" as AccountId;

describe("escapeCsvField", () => {
  it("leaves plain fields untouched", () => {
    expect(escapeCsvField("Blue Bottle Coffee")).toBe("Blue Bottle Coffee");
  });

  it("quotes and doubles embedded quotes", () => {
    expect(escapeCsvField('Say "hi"')).toBe('"Say ""hi"""');
  });

  it("quotes a field containing a comma", () => {
    expect(escapeCsvField("Doe, Jane")).toBe('"Doe, Jane"');
  });

  it("quotes a field containing a newline", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
  });
});

describe("signedDollarAmount", () => {
  const base = {
    id: "txn_1" as Transaction["id"],
    accountId: CHECKING,
    postedAt: "2026-11-01T00:00:00Z" as Transaction["postedAt"],
    description: "x",
    counterparty: "x",
    category: "Meals" as const,
    type: "card" as const,
    status: "posted" as const,
    balanceAfter: null,
  };

  it("is negative for a debit", () => {
    expect(signedDollarAmount({ ...base, direction: "debit", amount: 1_234 } as Transaction)).toBe("-12.34");
  });

  it("is positive for a credit", () => {
    expect(signedDollarAmount({ ...base, direction: "credit", amount: 1_234 } as Transaction)).toBe("12.34");
  });
});

describe("transactionsToCsv", () => {
  it("writes a header row and escapes a field that needs it", () => {
    const t: Transaction = {
      id: "txn_1" as Transaction["id"],
      accountId: CHECKING,
      postedAt: "2026-11-05T12:00:00Z" as Transaction["postedAt"],
      description: 'Dinner, "the usual"',
      counterparty: "Sweetgreen",
      category: "Meals",
      type: "card",
      direction: "debit",
      amount: 1_450 as Transaction["amount"],
      status: "posted",
      balanceAfter: 18_450_000 as Transaction["balanceAfter"],
    };
    const csv = transactionsToCsv([t], new Map([[CHECKING, "Operating checking"]]));
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("Date,Description,Counterparty,Category,Type,Status,Account,Amount,Balance after,Reference ID");
    expect(row).toBe('2026-11-05,"Dinner, ""the usual""",Sweetgreen,Meals,card,posted,Operating checking,-14.50,184500.00,txn_1');
  });

  it("falls back to the raw account id when no name is known", () => {
    const t: Transaction = {
      id: "txn_1" as Transaction["id"],
      accountId: CHECKING,
      postedAt: "2026-11-05T12:00:00Z" as Transaction["postedAt"],
      description: "x",
      counterparty: "x",
      category: "Meals",
      type: "card",
      direction: "debit",
      amount: 100 as Transaction["amount"],
      status: "posted",
      balanceAfter: null,
    };
    const csv = transactionsToCsv([t], new Map());
    expect(csv).toContain(CHECKING);
  });
});
