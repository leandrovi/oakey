import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  businessName: text("business_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
});

/** No balance column. Checking, savings, and card positions are folded from ledger_entries. */
export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.userId),
  kind: text("kind").notNull(),
  name: text("name").notNull(),
  mask: text("mask").notNull(),
  routingNumber: text("routing_number").notNull(),
  apyBps: integer("apy_bps"),
  creditLimitCents: integer("credit_limit_cents"),
  aprBps: integer("apr_bps"),
  dueDate: text("due_date"),
});

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => profiles.userId),
    accountId: text("account_id").notNull(),
    cardId: text("card_id"),
    postedAt: timestamp("posted_at", { withTimezone: true, mode: "string" }).notNull(),
    description: text("description").notNull(),
    counterparty: text("counterparty").notNull(),
    category: text("category").notNull(),
    type: text("type").notNull(),
    direction: text("direction").notNull(),
    amountCents: integer("amount_cents").notNull(),
    status: text("status").notNull(),
    wireId: text("wire_id"),
  },
  (table) => [check("ledger_amount_positive", sql`${table.amountCents} > 0`), index("ledger_entries_user").on(table.userId)],
);

export const recipients = pgTable("recipients", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.userId),
  name: text("name").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  state: text("state").notNull(),
  postalCode: text("postal_code").notNull(),
  bankName: text("bank_name").notNull(),
  routingNumber: text("routing_number").notNull(),
  accountNumber: text("account_number").notNull(),
  lastPaidAt: timestamp("last_paid_at", { withTimezone: true, mode: "string" }),
});

export const wires = pgTable("wires", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.userId),
  idempotencyKey: text("idempotency_key").notNull(),
  fromAccountId: text("from_account_id").notNull(),
  recipientId: text("recipient_id").notNull(),
  amountCents: integer("amount_cents").notNull(),
  feeCents: integer("fee_cents").notNull(),
  memo: text("memo").notNull(),
  purpose: text("purpose").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  expectedSettlementDate: text("expected_settlement_date").notNull(),
  ledgerLockedAt: timestamp("ledger_locked_at", { withTimezone: true, mode: "string" }),
  abaCheckedAt: timestamp("aba_checked_at", { withTimezone: true, mode: "string" }),
  fedwireSentAt: timestamp("fedwire_sent_at", { withTimezone: true, mode: "string" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
  failedAt: timestamp("failed_at", { withTimezone: true, mode: "string" }),
});

export const cards = pgTable("cards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.userId),
  kind: text("kind").notNull(),
  nickname: text("nickname").notNull(),
  cardholder: text("cardholder").notNull(),
  last4: text("last4").notNull(),
  expMonth: integer("exp_month").notNull(),
  expYear: integer("exp_year").notNull(),
  status: text("status").notNull(),
  onlinePurchases: boolean("online_purchases").notNull(),
  internationalPurchases: boolean("international_purchases").notNull(),
  monthlyLimit: integer("monthly_limit").notNull(),
  perTransactionLimit: integer("per_transaction_limit").notNull(),
  canceledReason: text("canceled_reason"),
});

export const loanOffers = pgTable("loan_offers", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.userId),
  name: text("name").notNull(),
  maxAmount: integer("max_amount").notNull(),
  minTermMonths: integer("min_term_months").notNull(),
  maxTermMonths: integer("max_term_months").notNull(),
  aprBps: integer("apr_bps").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const loans = pgTable("loans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => profiles.userId),
  offerId: text("offer_id").notNull(),
  name: text("name").notNull(),
  principal: integer("principal").notNull(),
  aprBps: integer("apr_bps").notNull(),
  termMonths: integer("term_months").notNull(),
  monthlyPayment: integer("monthly_payment").notNull(),
  status: text("status").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true, mode: "string" }).notNull(),
  schedule: jsonb("schedule").notNull(),
});

export const creditProfiles = pgTable("credit_profiles", {
  userId: text("user_id").primaryKey().references(() => profiles.userId),
  score: integer("score").notNull(),
  updatedAt: text("updated_at").notNull(),
  factors: jsonb("factors").notNull(),
  history: jsonb("history").notNull(),
});

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    requestHash: text("request_hash").notNull(),
    response: jsonb("response").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  },
  (table) => [uniqueIndex("idempotency_user_scope_key").on(table.userId, table.scope, table.key)],
);

export const rateLimits = pgTable(
  "rate_limits",
  {
    userId: text("user_id").notNull(),
    bucket: text("bucket").notNull(),
    windowStart: text("window_start").notNull(),
    count: integer("count").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.bucket, table.windowStart] })],
);
