import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { Installment } from "@/lib/domain/types";
import { generateBook, type BookProfile, type GeneratedBook, type GeneratedEntry, type GeneratedWire } from "@/lib/ledger/generate";
import { projectBook, type BankSnapshot } from "@/lib/ledger/project";
import type { WireAccount, WireEntry, WireRecord } from "@/lib/wires/apply";
import { database, type Tx } from "@/server/db";
import { accounts, cards, creditProfiles, ledgerEntries, loanOffers, loans, profiles, recipients, wires } from "@/server/schema";

export interface OwnedRows {
  accounts: WireAccount[];
  entries: WireEntry[];
  wires: WireRecord[];
}

function chunk<T>(rows: T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < rows.length; i += size) groups.push(rows.slice(i, i + size));
  return groups;
}

function entryRow(entry: GeneratedEntry) {
  return {
    id: entry.id,
    userId: entry.userId,
    accountId: entry.accountId,
    cardId: entry.cardId,
    postedAt: entry.postedAt,
    description: entry.description,
    counterparty: entry.counterparty,
    category: entry.category,
    type: entry.type,
    direction: entry.direction,
    amountCents: entry.amount,
    status: entry.status,
    wireId: entry.wireId,
  };
}

function wireRow(wire: GeneratedWire) {
  return {
    id: wire.id,
    userId: wire.userId,
    idempotencyKey: wire.idempotencyKey,
    fromAccountId: wire.fromAccountId,
    recipientId: wire.recipientId,
    amountCents: wire.amount,
    feeCents: wire.fee,
    memo: wire.memo,
    purpose: wire.purpose,
    status: wire.status,
    createdAt: wire.createdAt,
    expectedSettlementDate: wire.expectedSettlementDate,
    ledgerLockedAt: wire.ledgerLockedAt,
    abaCheckedAt: wire.abaCheckedAt,
    fedwireSentAt: wire.fedwireSentAt,
    completedAt: wire.completedAt,
    failedAt: wire.failedAt,
  };
}

async function insertBook(tx: Tx, profile: BookProfile & { createdAt: string }, book: GeneratedBook) {
  await tx.insert(profiles).values({
    userId: profile.userId,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    businessName: profile.businessName,
    createdAt: profile.createdAt,
  });
  await tx.insert(accounts).values(book.accounts.map((account) => ({
    id: account.id,
    userId: account.userId,
    kind: account.kind,
    name: account.name,
    mask: account.mask,
    routingNumber: account.routingNumber,
    apyBps: account.apyBps,
    creditLimitCents: account.creditLimitCents,
    aprBps: account.aprBps,
    dueDate: account.dueDate,
  })));
  for (const group of chunk(book.entries, 80)) await tx.insert(ledgerEntries).values(group.map(entryRow));
  await tx.insert(cards).values(book.cards.map((card) => ({
    id: card.id,
    userId: card.userId,
    kind: card.kind,
    nickname: card.nickname,
    cardholder: card.cardholder,
    last4: card.last4,
    expMonth: card.expMonth,
    expYear: card.expYear,
    status: card.status,
    onlinePurchases: card.onlinePurchases,
    internationalPurchases: card.internationalPurchases,
    monthlyLimit: card.monthlyLimit,
    perTransactionLimit: card.perTransactionLimit,
  })));
  await tx.insert(recipients).values(book.recipients);
  await tx.insert(wires).values(book.wires.map(wireRow));
  if (book.offers.length > 0) await tx.insert(loanOffers).values(book.offers);
  if (book.loans.length > 0) {
    await tx.insert(loans).values(book.loans.map((loan) => ({
      id: loan.id,
      userId: loan.userId,
      offerId: loan.offerId,
      name: loan.name,
      principal: loan.principal,
      aprBps: loan.aprBps,
      termMonths: loan.termMonths,
      monthlyPayment: loan.monthlyPayment,
      status: loan.status,
      requestedAt: loan.requestedAt,
      schedule: loan.schedule,
    })));
  }
  await tx.insert(creditProfiles).values({
    userId: book.credit.userId,
    score: book.credit.score,
    updatedAt: book.credit.updatedAt,
    factors: book.credit.factors,
    history: book.credit.history,
  });
}

export async function provision(profile: BookProfile & { createdAt: string }) {
  await database().transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${profile.userId}))`);
    const existing = await tx.select({ userId: profiles.userId }).from(profiles).where(eq(profiles.userId, profile.userId)).limit(1);
    if (existing.length > 0) return;
    await insertBook(tx, profile, generateBook(profile));
  });
}

export async function readBook(userId: string): Promise<BankSnapshot | null> {
  const db = database();
  const profileRows = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  const profile = profileRows[0];
  if (!profile) return null;
  const [accountRows, entryRows, cardRows, recipientRows, wireRows, offerRows, loanRows, creditRows] = await Promise.all([
    db.select().from(accounts).where(eq(accounts.userId, userId)),
    db.select().from(ledgerEntries).where(eq(ledgerEntries.userId, userId)),
    db.select().from(cards).where(eq(cards.userId, userId)),
    db.select().from(recipients).where(eq(recipients.userId, userId)),
    db.select().from(wires).where(eq(wires.userId, userId)),
    db.select().from(loanOffers).where(eq(loanOffers.userId, userId)),
    db.select().from(loans).where(eq(loans.userId, userId)),
    db.select().from(creditProfiles).where(eq(creditProfiles.userId, userId)).limit(1),
  ]);
  const credit = creditRows[0];
  if (!credit) return null;
  const book: GeneratedBook = {
    accounts: accountRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      kind: row.kind as GeneratedBook["accounts"][number]["kind"],
      name: row.name,
      mask: row.mask,
      routingNumber: row.routingNumber,
      apyBps: row.apyBps,
      creditLimitCents: row.creditLimitCents,
      aprBps: row.aprBps,
      dueDate: row.dueDate,
    })),
    entries: entryRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      accountId: row.accountId,
      cardId: row.cardId,
      postedAt: row.postedAt,
      description: row.description,
      counterparty: row.counterparty,
      category: row.category,
      type: row.type,
      direction: row.direction as GeneratedEntry["direction"],
      amount: row.amountCents,
      status: row.status as GeneratedEntry["status"],
      wireId: row.wireId,
    })),
    cards: cardRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      kind: row.kind as GeneratedBook["cards"][number]["kind"],
      nickname: row.nickname,
      cardholder: row.cardholder,
      last4: row.last4,
      expMonth: row.expMonth,
      expYear: row.expYear,
      status: row.status as GeneratedBook["cards"][number]["status"],
      onlinePurchases: row.onlinePurchases,
      internationalPurchases: row.internationalPurchases,
      monthlyLimit: row.monthlyLimit,
      perTransactionLimit: row.perTransactionLimit,
    })),
    recipients: recipientRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      line1: row.line1,
      line2: row.line2,
      city: row.city,
      state: row.state,
      postalCode: row.postalCode,
      bankName: row.bankName,
      routingNumber: row.routingNumber,
      accountNumber: row.accountNumber,
      lastPaidAt: row.lastPaidAt,
    })),
    wires: wireRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      idempotencyKey: row.idempotencyKey,
      fromAccountId: row.fromAccountId,
      recipientId: row.recipientId,
      amount: row.amountCents,
      fee: row.feeCents,
      memo: row.memo,
      purpose: row.purpose,
      status: row.status as GeneratedWire["status"],
      createdAt: row.createdAt,
      expectedSettlementDate: row.expectedSettlementDate,
      ledgerLockedAt: row.ledgerLockedAt,
      abaCheckedAt: row.abaCheckedAt,
      fedwireSentAt: row.fedwireSentAt,
      completedAt: row.completedAt,
      failedAt: row.failedAt,
    })),
    offers: offerRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.name,
      maxAmount: row.maxAmount,
      minTermMonths: row.minTermMonths,
      maxTermMonths: row.maxTermMonths,
      aprBps: row.aprBps,
      expiresAt: row.expiresAt,
    })),
    loans: loanRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      offerId: row.offerId,
      name: row.name,
      principal: row.principal,
      aprBps: row.aprBps,
      termMonths: row.termMonths,
      monthlyPayment: row.monthlyPayment,
      status: row.status as GeneratedBook["loans"][number]["status"],
      requestedAt: row.requestedAt,
      schedule: row.schedule as Installment[],
    })),
    credit: {
      userId: credit.userId,
      score: credit.score,
      updatedAt: credit.updatedAt,
      factors: credit.factors as GeneratedBook["credit"]["factors"],
      history: credit.history as GeneratedBook["credit"]["history"],
    },
  };
  return projectBook({
    userId: profile.userId,
    email: profile.email,
    firstName: profile.firstName,
    lastName: profile.lastName,
    businessName: profile.businessName,
    createdAt: profile.createdAt,
  }, book);
}

export async function loadOwned(tx: Tx, userId: string): Promise<OwnedRows> {
  const accountRows = await tx.select().from(accounts).where(eq(accounts.userId, userId));
  const entryRows = await tx.select().from(ledgerEntries).where(eq(ledgerEntries.userId, userId));
  const wireRows = await tx.select().from(wires).where(eq(wires.userId, userId));
  return {
    accounts: accountRows.map((row) => ({ id: row.id, userId: row.userId, kind: row.kind as WireAccount["kind"] })),
    entries: entryRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      accountId: row.accountId,
      wireId: row.wireId,
      postedAt: row.postedAt,
      description: row.description,
      counterparty: row.counterparty,
      category: row.category,
      type: row.type,
      direction: row.direction as WireEntry["direction"],
      amount: row.amountCents,
      status: row.status as WireEntry["status"],
    })),
    wires: wireRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      idempotencyKey: row.idempotencyKey,
      fromAccountId: row.fromAccountId,
      recipientId: row.recipientId,
      amount: row.amountCents,
      fee: row.feeCents,
      memo: row.memo,
      purpose: row.purpose,
      status: row.status as WireRecord["status"],
      createdAt: row.createdAt as WireRecord["createdAt"],
      expectedSettlementDate: row.expectedSettlementDate as WireRecord["expectedSettlementDate"],
      ledgerLockedAt: row.ledgerLockedAt as WireRecord["ledgerLockedAt"],
      abaCheckedAt: row.abaCheckedAt as WireRecord["abaCheckedAt"],
      fedwireSentAt: row.fedwireSentAt as WireRecord["fedwireSentAt"],
      completedAt: row.completedAt as WireRecord["completedAt"],
      failedAt: row.failedAt as WireRecord["failedAt"],
    })),
  };
}

export async function requireBook(): Promise<BankSnapshot> {
  const session = await auth();
  if (!session.userId) redirect("/sign-in");
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const meta = user.unsafeMetadata;
  const businessName = meta && typeof meta === "object" && "businessName" in meta && typeof meta.businessName === "string" && meta.businessName.trim()
    ? meta.businessName.trim()
    : "Business";
  const profile = {
    userId: user.id,
    email: user.primaryEmailAddress?.emailAddress ?? "",
    firstName: user.firstName ?? "Member",
    lastName: user.lastName ?? "",
    businessName,
    createdAt: new Date(user.createdAt).toISOString(),
  };
  await provision(profile);
  const book = await readBook(user.id);
  if (!book) redirect("/sign-in");
  return book;
}

export async function ownedRecipient(tx: Tx, userId: string, recipientId: string) {
  const rows = await tx.select().from(recipients).where(and(eq(recipients.userId, userId), eq(recipients.id, recipientId))).limit(1);
  return rows[0] ?? null;
}
