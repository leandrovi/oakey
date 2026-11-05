import { describe, expect, it } from "vitest";
import type { Cents } from "@/lib/domain/types";
import { maxWireAmount, moveMoneySchema, newRecipientSchema, wireAmountSchema } from "./wire-form";

const BALANCE = 1_000_00 as Cents;

const validRecipient = {
  name: "Studio Marrow LLC",
  addressLine1: "410 Bedford Ave",
  city: "Brooklyn",
  state: "NY",
  postalCode: "11249",
  bankName: "Chase",
  routingNumber: "021000021",
  accountNumber: "000123456789",
  confirmAccountNumber: "000123456789",
};

describe("newRecipientSchema", () => {
  it("accepts a valid recipient", () => {
    expect(newRecipientSchema.safeParse(validRecipient).success).toBe(true);
  });

  it("rejects a routing number that fails the ABA checksum", () => {
    const result = newRecipientSchema.safeParse({ ...validRecipient, routingNumber: "021000022" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("routingNumber"))).toBe(true);
    }
  });

  it("rejects mismatched account numbers", () => {
    const result = newRecipientSchema.safeParse({ ...validRecipient, confirmAccountNumber: "999999999999" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("confirmAccountNumber"))).toBe(true);
    }
  });
});

describe("wireAmountSchema", () => {
  const schema = wireAmountSchema(BALANCE);

  it("accepts a valid amount within the available balance", () => {
    const result = schema.safeParse({ amount: "100.00", purpose: "Contractor payment" });
    expect(result.success).toBe(true);
  });

  it("rejects a zero amount", () => {
    const result = schema.safeParse({ amount: "0", purpose: "Contractor payment" });
    expect(result.success).toBe(false);
  });

  it("rejects an amount over the available balance minus the wire fee", () => {
    const tooMuch = maxWireAmount(BALANCE) + 100;
    const result = schema.safeParse({ amount: (tooMuch / 100).toFixed(2), purpose: "Contractor payment" });
    expect(result.success).toBe(false);
  });

  it("accepts exactly the max sendable amount", () => {
    const max = maxWireAmount(BALANCE);
    const result = schema.safeParse({ amount: (max / 100).toFixed(2), purpose: "Rent" });
    expect(result.success).toBe(true);
  });
});

describe("moveMoneySchema", () => {
  const schema = moveMoneySchema({ checking: BALANCE, savings: 50_00 as Cents });

  it("accepts a valid move between two different accounts", () => {
    const result = schema.safeParse({ fromAccountId: "checking", toAccountId: "savings", amount: "50.00" });
    expect(result.success).toBe(true);
  });

  it("rejects moving to the same account", () => {
    const result = schema.safeParse({ fromAccountId: "checking", toAccountId: "checking", amount: "50.00" });
    expect(result.success).toBe(false);
  });

  it("rejects an amount over the source account's balance", () => {
    const result = schema.safeParse({ fromAccountId: "savings", toAccountId: "checking", amount: "100.00" });
    expect(result.success).toBe(false);
  });
});
