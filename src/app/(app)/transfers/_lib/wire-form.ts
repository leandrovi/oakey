import { z } from "zod";
import { parseRoutingNumber } from "@/lib/domain/aba";
import { WIRE_FEE } from "@/lib/domain/fedwire";
import { parseDollars } from "@/lib/domain/money";
import type { Cents } from "@/lib/domain/types";

export const WIRE_PURPOSES = [
  "Contractor payment",
  "Vendor payment",
  "Rent",
  "Legal services",
  "Payroll",
  "Loan payoff",
  "Other",
] as const;
export type WirePurpose = (typeof WIRE_PURPOSES)[number];

export const fromAccountSchema = z.object({
  fromAccountId: z.string().min(1, "Choose an account to send from."),
});
export type FromAccountInput = z.infer<typeof fromAccountSchema>;

export const recipientSelectionSchema = z.object({
  recipientId: z.string().min(1, "Choose a recipient."),
});
export type RecipientSelectionInput = z.infer<typeof recipientSelectionSchema>;

const routingNumberField = z
  .string()
  .trim()
  .refine((value) => parseRoutingNumber(value) !== null, "Enter a valid 9-digit routing number.");

export const newRecipientSchema = z
  .object({
    name: z.string().trim().min(1, "Enter the recipient's name."),
    addressLine1: z.string().trim().min(1, "Enter a street address."),
    addressLine2: z.string().trim().optional(),
    city: z.string().trim().min(1, "Enter a city."),
    state: z.string().trim().min(2, "Use a 2-letter state code.").max(2, "Use a 2-letter state code."),
    postalCode: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a valid ZIP code."),
    bankName: z.string().trim().min(1, "Enter the bank name."),
    routingNumber: routingNumberField,
    accountNumber: z.string().trim().min(4, "Enter the account number."),
    confirmAccountNumber: z.string().trim().min(1, "Confirm the account number."),
  })
  .refine((data) => data.accountNumber === data.confirmAccountNumber, {
    message: "Account numbers don't match.",
    path: ["confirmAccountNumber"],
  });
export type NewRecipientInput = z.infer<typeof newRecipientSchema>;

/** Largest wire amount sendable from a balance once the Fedwire fee is deducted. */
export function maxWireAmount(availableBalance: Cents): Cents {
  return Math.max(0, availableBalance - WIRE_FEE) as Cents;
}

export function wireAmountSchema(availableBalance: Cents) {
  const max = maxWireAmount(availableBalance);
  return z.object({
    amount: z
      .string()
      .refine((value) => parseDollars(value) !== null, "Enter a valid dollar amount.")
      .refine((value) => (parseDollars(value) ?? 0) > 0, "Enter an amount greater than $0.")
      .refine(
        (value) => (parseDollars(value) ?? Number.POSITIVE_INFINITY) <= max,
        "Amount exceeds what's available to send, after the wire fee.",
      ),
    memo: z.string().trim().max(140, "Keep the memo under 140 characters.").optional(),
    purpose: z.enum(WIRE_PURPOSES, "Choose a purpose."),
  });
}
export type WireAmountInput = z.infer<ReturnType<typeof wireAmountSchema>>;

/** Validates a between-accounts move against the balance of whichever account is selected as the source. */
export function moveMoneySchema(balanceByAccountId: Record<string, Cents>) {
  return z
    .object({
      fromAccountId: z.string().min(1, "Choose an account to move money from."),
      toAccountId: z.string().min(1, "Choose an account to move money to."),
      amount: z
        .string()
        .refine((value) => parseDollars(value) !== null, "Enter a valid dollar amount.")
        .refine((value) => (parseDollars(value) ?? 0) > 0, "Enter an amount greater than $0."),
    })
    .refine((data) => data.fromAccountId !== data.toAccountId, {
      message: "Choose two different accounts.",
      path: ["toAccountId"],
    })
    .refine(
      (data) => {
        const available = balanceByAccountId[data.fromAccountId] ?? 0;
        const amount = parseDollars(data.amount) ?? Number.POSITIVE_INFINITY;
        return amount <= available;
      },
      { message: "Amount exceeds the available balance.", path: ["amount"] },
    );
}
export type MoveMoneyInput = z.infer<ReturnType<typeof moveMoneySchema>>;
