import { TRANSACTION_CATEGORIES, type AccountId, type Card, type CardId, type DepositAccount, type TransactionStatus, type TransactionType } from "@/lib/domain/types";
import type { PeriodPreset } from "./filters";

export interface AccountOption {
  id: AccountId | CardId;
  label: string;
}

export function accountOptions(accounts: DepositAccount[], cards: Card[]): AccountOption[] {
  return [
    ...accounts.map((a) => ({ id: a.id, label: `${a.name} ${a.kind === "checking" ? "checking" : "savings"}` })),
    ...cards.map((c) => ({ id: c.id, label: `${c.nickname} ····${c.last4}` })),
  ];
}

export function accountNameMap(accounts: DepositAccount[], cards: Card[]): Map<AccountId | CardId, string> {
  return new Map(accountOptions(accounts, cards).map((o) => [o.id, o.label]));
}

export const CATEGORY_OPTIONS = TRANSACTION_CATEGORIES;

export const STATUS_OPTIONS: TransactionStatus[] = ["pending", "posted", "failed"];

export const TYPE_OPTIONS: TransactionType[] = ["card", "wire", "ach", "internal", "fee", "interest", "loan"];

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "mtd", label: "This month" },
  { value: "custom", label: "Custom range" },
];

export function typeLabel(type: TransactionType): string {
  switch (type) {
    case "ach":
      return "ACH";
    default:
      return type[0].toUpperCase() + type.slice(1);
  }
}
