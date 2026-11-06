"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { amortizationSchedule, monthlyPayment } from "@/lib/domain/amortization";
import type { IsoDate } from "@/lib/domain/types";
import { owedBalance } from "@/lib/ledger/balance";
import { postPayment } from "@/lib/ledger/payments";
import { payoffAmount } from "@/app/(app)/loans/_lib/reducer";
import { newRecipientSchema } from "@/app/(app)/transfers/_lib/wire-form";
import { cancelWire, internalTransfer, submitWire, type WireEntry } from "@/lib/wires/apply";
import { actionError, actorId } from "@/server/actor";
import { loadOwned, ownedRecipient } from "@/server/book";
import type { Tx } from "@/server/db";
import { type ActionResult, withMovement } from "@/server/movement";
import { accounts, cards, ledgerEntries, loanOffers, loans, profiles, recipients, wires } from "@/server/schema";

function touch() {
  revalidatePath("/", "layout");
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

async function insertEntries(tx: Tx, rows: WireEntry[]) {
  if (rows.length === 0) return;
  await tx.insert(ledgerEntries).values(rows.map((entry) => ({
    id: entry.id,
    userId: entry.userId,
    accountId: entry.accountId,
    cardId: null,
    postedAt: entry.postedAt,
    description: entry.description,
    counterparty: entry.counterparty,
    category: entry.category,
    type: entry.type,
    direction: entry.direction,
    amountCents: entry.amount,
    status: entry.status,
    wireId: entry.wireId,
  })));
}

const wireSchema = z.object({
  idempotencyKey: z.string().uuid(),
  fromAccountId: z.string().min(1),
  amount: z.number().int().positive(),
  memo: z.string().max(140),
  purpose: z.string().trim().min(1).max(80),
  recipientId: z.string().min(1).optional(),
  newRecipient: newRecipientSchema.optional(),
}).refine((value) => value.recipientId || value.newRecipient, { message: "Choose a recipient." });

export async function submitWireAction(input: unknown): Promise<ActionResult<{ wireId: string }>> {
  try {
    const parsed = wireSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the wire and try again." };
    const userId = await actorId();
    const body = parsed.data;
    const result = await withMovement(userId, "wire", body.idempotencyKey, {
      fromAccountId: body.fromAccountId,
      amount: body.amount,
      memo: body.memo,
      purpose: body.purpose,
      recipientId: body.recipientId ?? null,
      newRecipient: body.newRecipient ?? null,
    }, async (tx) => {
      let recipientId = body.recipientId ?? "";
      let recipientName = "";
      let routingNumber = "";
      if (body.newRecipient) {
        const created = body.newRecipient;
        if (!created) return { ok: false, message: "Choose a recipient." };
        recipientId = id("rcp");
        recipientName = created.name;
        routingNumber = created.routingNumber;
        await tx.insert(recipients).values({
          id: recipientId,
          userId,
          name: created.name,
          line1: created.addressLine1,
          line2: created.addressLine2 || null,
          city: created.city,
          state: created.state.toUpperCase(),
          postalCode: created.postalCode,
          bankName: created.bankName,
          routingNumber: created.routingNumber,
          accountNumber: created.accountNumber,
          lastPaidAt: null,
        });
      } else {
        const saved = await ownedRecipient(tx, userId, recipientId);
        if (!saved) return { ok: false, message: "That recipient isn't yours." };
        recipientName = saved.name;
        routingNumber = saved.routingNumber;
      }
      const owned = await loadOwned(tx, userId);
      const submitted = submitWire({
        actorId: userId,
        accounts: owned.accounts,
        entries: owned.entries,
        recipient: { id: recipientId, userId, name: recipientName, routingNumber },
        fromAccountId: body.fromAccountId,
        amount: body.amount,
        memo: body.memo,
        purpose: body.purpose,
        idempotencyKey: body.idempotencyKey,
        wireId: id("wire"),
        principalEntryId: id("ent"),
        feeEntryId: id("ent"),
        now: new Date(),
      });
      if (!submitted.ok) return submitted;
      const wire = submitted.data.wire;
      await tx.insert(wires).values({
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
      });
      await insertEntries(tx, submitted.data.entries);
      return { ok: true, data: { wireId: wire.id } };
    });
    if (result.ok) touch();
    return result;
  } catch (error) {
    return actionError(error);
  }
}

const cancelSchema = z.object({ idempotencyKey: z.string().uuid(), wireId: z.string().min(1) });

export async function cancelWireAction(input: unknown): Promise<ActionResult<{ wireId: string }>> {
  try {
    const parsed = cancelSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "That wire can't be canceled." };
    const userId = await actorId();
    const result = await withMovement(userId, "wire-cancel", parsed.data.idempotencyKey, { wireId: parsed.data.wireId }, async (tx) => {
      const owned = await loadOwned(tx, userId);
      const wire = owned.wires.find((row) => row.id === parsed.data.wireId);
      const canceled = cancelWire(userId, wire, owned.entries, new Date());
      if (!canceled.ok) return canceled;
      await tx.update(wires).set({ status: "canceled" }).where(and(eq(wires.userId, userId), eq(wires.id, parsed.data.wireId)));
      if (canceled.data.voidedEntryIds.length > 0) {
        await tx.update(ledgerEntries).set({ status: "void" }).where(and(eq(ledgerEntries.userId, userId), inArray(ledgerEntries.id, canceled.data.voidedEntryIds)));
      }
      return { ok: true, data: { wireId: parsed.data.wireId } };
    });
    if (result.ok) touch();
    return result;
  } catch (error) {
    return actionError(error);
  }
}

const transferSchema = z.object({
  idempotencyKey: z.string().uuid(),
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.number().int().positive(),
});

export async function transferAction(input: unknown): Promise<ActionResult<{ amount: number }>> {
  try {
    const parsed = transferSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the transfer and try again." };
    const userId = await actorId();
    const body = parsed.data;
    const result = await withMovement(userId, "transfer", body.idempotencyKey, {
      fromAccountId: body.fromAccountId,
      toAccountId: body.toAccountId,
      amount: body.amount,
    }, async (tx) => {
      const owned = await loadOwned(tx, userId);
      const moved = internalTransfer({
        actorId: userId,
        accounts: owned.accounts,
        entries: owned.entries,
        fromAccountId: body.fromAccountId,
        toAccountId: body.toAccountId,
        amount: body.amount,
        debitId: id("ent"),
        creditId: id("ent"),
        now: new Date(),
      });
      if (!moved.ok) return moved;
      await insertEntries(tx, moved.data);
      return { ok: true, data: { amount: body.amount } };
    });
    if (result.ok) touch();
    return result;
  } catch (error) {
    return actionError(error);
  }
}

const payCardSchema = z.object({
  idempotencyKey: z.string().uuid(),
  fromAccountId: z.string().min(1),
  amount: z.number().int().positive(),
});

export async function payCardAction(input: unknown): Promise<ActionResult<{ amount: number }>> {
  try {
    const parsed = payCardSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Check the payment and try again." };
    const userId = await actorId();
    const body = parsed.data;
    const result = await withMovement(userId, "card-payment", body.idempotencyKey, body, async (tx) => {
      const owned = await loadOwned(tx, userId);
      const credit = owned.accounts.find((account) => account.kind === "credit");
      if (!credit) return { ok: false, message: "No card account on this profile." };
      if (body.amount > owedBalance(owned.entries, credit.id)) return { ok: false, message: "That payment is more than the card balance." };
      const paid = postPayment({
        actorId: userId,
        accounts: owned.accounts,
        entries: owned.entries,
        fromAccountId: body.fromAccountId,
        creditAccountId: credit.id,
        creditId: id("ent"),
        amount: body.amount,
        debitId: id("ent"),
        description: "Card balance payment",
        counterparty: "Oakey Card",
        category: "Transfers",
        type: "internal",
        now: new Date(),
      });
      if (!paid.ok) return paid;
      await insertEntries(tx, paid.data);
      return { ok: true, data: { amount: body.amount } };
    });
    if (result.ok) touch();
    return result;
  } catch (error) {
    return actionError(error);
  }
}

const issueSchema = z.object({
  idempotencyKey: z.string().uuid(),
  id: z.string().min(1).max(40),
  kind: z.enum(["virtual", "physical"]),
  nickname: z.string().trim().min(1).max(40),
  cardholder: z.string().trim().min(1).max(60),
  last4: z.string().regex(/^\d{4}$/),
  expMonth: z.number().int().min(1).max(12),
  expYear: z.number().int().min(2026).max(2040),
  monthlyLimit: z.number().int().positive(),
  perTransactionLimit: z.number().int().positive(),
});

export async function issueCardAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = issueSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the card and try again." };
    const userId = await actorId();
    const body = parsed.data;
    const result = await withMovement(userId, "issue-card", body.idempotencyKey, body, async (tx) => {
      await tx.insert(cards).values({
        id: body.id,
        userId,
        kind: body.kind,
        nickname: body.nickname,
        cardholder: body.cardholder,
        last4: body.last4,
        expMonth: body.expMonth,
        expYear: body.expYear,
        status: "active",
        onlinePurchases: true,
        internationalPurchases: false,
        monthlyLimit: body.monthlyLimit,
        perTransactionLimit: body.perTransactionLimit,
      });
      return { ok: true, data: { id: body.id } };
    });
    if (result.ok) touch();
    return result;
  } catch (error) {
    return actionError(error);
  }
}

const cardChangeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("freeze"), id: z.string() }),
  z.object({ type: z.literal("unfreeze"), id: z.string() }),
  z.object({ type: z.literal("toggleOnline"), id: z.string() }),
  z.object({ type: z.literal("toggleInternational"), id: z.string() }),
  z.object({ type: z.literal("setMonthlyLimit"), id: z.string(), limit: z.number().int().positive() }),
  z.object({ type: z.literal("setPerTransactionLimit"), id: z.string(), limit: z.number().int().positive() }),
  z.object({ type: z.literal("reportLost"), id: z.string() }),
  z.object({ type: z.literal("cancel"), id: z.string(), reason: z.enum(["no_longer_needed", "compromised", "lost", "employee_left", "other"]) }),
]);

export async function updateCardAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = cardChangeSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "That card change isn't valid." };
    const userId = await actorId();
    const body = parsed.data;
    const rows = await databaseCard(userId, body.id);
    if (!rows) return { ok: false, message: "That card isn't yours." };
    if (rows.status === "canceled") return { ok: false, message: "A canceled card can't be changed." };
    if (body.type === "freeze" && rows.status === "active") await patchCard(userId, body.id, { status: "frozen" });
    else if (body.type === "unfreeze" && rows.status === "frozen") await patchCard(userId, body.id, { status: "active" });
    else if (body.type === "toggleOnline" && rows.status !== "lost") await patchCard(userId, body.id, { onlinePurchases: !rows.onlinePurchases });
    else if (body.type === "toggleInternational" && rows.status !== "lost") await patchCard(userId, body.id, { internationalPurchases: !rows.internationalPurchases });
    else if (body.type === "setMonthlyLimit" && rows.status !== "lost") await patchCard(userId, body.id, { monthlyLimit: body.limit });
    else if (body.type === "setPerTransactionLimit" && rows.status !== "lost") await patchCard(userId, body.id, { perTransactionLimit: body.limit });
    else if (body.type === "reportLost") await patchCard(userId, body.id, { status: "lost" });
    else if (body.type === "cancel") await patchCard(userId, body.id, { status: "canceled", canceledReason: body.reason });
    else return { ok: false, message: "That card can't take that change." };
    touch();
    return { ok: true, data: { id: body.id } };
  } catch (error) {
    return actionError(error);
  }
}

async function databaseCard(userId: string, cardId: string) {
  const { database } = await import("@/server/db");
  const rows = await database().select().from(cards).where(and(eq(cards.userId, userId), eq(cards.id, cardId))).limit(1);
  return rows[0] ?? null;
}

async function patchCard(userId: string, cardId: string, values: Partial<typeof cards.$inferInsert>) {
  const { database } = await import("@/server/db");
  await database().update(cards).set(values).where(and(eq(cards.userId, userId), eq(cards.id, cardId)));
}

const loanRequestSchema = z.object({
  idempotencyKey: z.string().uuid(),
  id: z.string().min(1).max(40),
  offerId: z.string().min(1),
  amount: z.number().int().positive(),
  termMonths: z.number().int().positive(),
});

export async function requestLoanAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = loanRequestSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Check the loan and try again." };
    const userId = await actorId();
    const body = parsed.data;
    const result = await withMovement(userId, "loan-request", body.idempotencyKey, body, async (tx) => {
      const offerRows = await tx.select().from(loanOffers).where(and(eq(loanOffers.userId, userId), eq(loanOffers.id, body.offerId))).limit(1);
      const offer = offerRows[0];
      if (!offer) return { ok: false, message: "That offer isn't yours." };
      if (body.amount > offer.maxAmount || body.termMonths < offer.minTermMonths || body.termMonths > offer.maxTermMonths) {
        return { ok: false, message: "That amount or term is outside the offer." };
      }
      const due = new Date();
      due.setUTCMonth(due.getUTCMonth() + 1);
      const firstDue = due.toISOString().slice(0, 10) as IsoDate;
      const schedule = amortizationSchedule(body.amount as never, offer.aprBps as never, body.termMonths, firstDue);
      await tx.insert(loans).values({
        id: body.id,
        userId,
        offerId: offer.id,
        name: offer.name,
        principal: body.amount,
        aprBps: offer.aprBps,
        termMonths: body.termMonths,
        monthlyPayment: monthlyPayment(body.amount as never, offer.aprBps as never, body.termMonths),
        status: "pending",
        requestedAt: new Date().toISOString(),
        schedule,
      });
      return { ok: true, data: { id: body.id } };
    });
    if (result.ok) touch();
    return result;
  } catch (error) {
    return actionError(error);
  }
}

const loanIdSchema = z.object({ idempotencyKey: z.string().uuid(), loanId: z.string().min(1) });

export async function cancelLoanAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = loanIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "That application can't be canceled." };
    const userId = await actorId();
    const result = await withMovement(userId, "loan-cancel", parsed.data.idempotencyKey, { loanId: parsed.data.loanId }, async (tx) => {
      const rows = await tx.select().from(loans).where(and(eq(loans.userId, userId), eq(loans.id, parsed.data.loanId))).limit(1);
      const loan = rows[0];
      if (!loan) return { ok: false, message: "That application isn't yours." };
      if (loan.status !== "pending") return { ok: false, message: "Only a pending application can be canceled." };
      await tx.update(loans).set({ status: "canceled" }).where(and(eq(loans.userId, userId), eq(loans.id, loan.id)));
      return { ok: true, data: { id: loan.id } };
    });
    if (result.ok) touch();
    return result;
  } catch (error) {
    return actionError(error);
  }
}

async function payLoan(userId: string, loanId: string, key: string, mode: "installment" | "payoff"): Promise<ActionResult<{ id: string }>> {
  return withMovement(userId, mode === "installment" ? "loan-installment" : "loan-payoff", key, { loanId }, async (tx) => {
    const rows = await tx.select().from(loans).where(and(eq(loans.userId, userId), eq(loans.id, loanId))).limit(1);
    const loan = rows[0];
    if (!loan || loan.status !== "active") return { ok: false, message: "That loan isn't active." };
    const schedule = loan.schedule as { number: number; dueDate: string; payment: number; principal: number; interest: number; remaining: number; paid: boolean }[];
    const view = {
      id: loan.id,
      offerId: loan.offerId,
      name: loan.name,
      principal: loan.principal,
      apr: loan.aprBps,
      termMonths: loan.termMonths,
      monthlyPayment: loan.monthlyPayment,
      status: loan.status,
      requestedAt: loan.requestedAt,
      schedule,
    } as Parameters<typeof payoffAmount>[0];
    const next = schedule.find((row) => !row.paid);
    if (!next) return { ok: false, message: "That loan is already paid off." };
    const amount = mode === "payoff" ? payoffAmount(view) : next.payment;
    const checking = (await tx.select().from(accounts).where(and(eq(accounts.userId, userId), eq(accounts.kind, "checking")))).at(0);
    if (!checking) return { ok: false, message: "No checking account on this profile." };
    const owned = await loadOwned(tx, userId);
    const paid = postPayment({
      actorId: userId,
      accounts: owned.accounts,
      entries: owned.entries,
      fromAccountId: checking.id,
      amount,
      debitId: id("ent"),
      description: mode === "payoff" ? `Pay off ${loan.name}` : `${loan.name} installment`,
      counterparty: "Oakey Lending",
      category: "Loan",
      type: "loan",
      now: new Date(),
    });
    if (!paid.ok) return paid;
    await insertEntries(tx, paid.data);
    const updated = mode === "payoff"
      ? schedule.map((row) => (row.paid ? row : { ...row, paid: true, remaining: 0 }))
      : schedule.map((row) => (row.number === next.number ? { ...row, paid: true } : row));
    const done = updated.every((row) => row.paid);
    await tx.update(loans).set({ schedule: updated, status: done || mode === "payoff" ? "paid_off" : "active" }).where(and(eq(loans.userId, userId), eq(loans.id, loan.id)));
    return { ok: true, data: { id: loan.id } };
  });
}

export async function payInstallmentAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = loanIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Check the payment and try again." };
    const userId = await actorId();
    const result = await payLoan(userId, parsed.data.loanId, parsed.data.idempotencyKey, "installment");
    if (result.ok) touch();
    return result;
  } catch (error) {
    return actionError(error);
  }
}

export async function payOffLoanAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = loanIdSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: "Check the payoff and try again." };
    const userId = await actorId();
    const result = await payLoan(userId, parsed.data.loanId, parsed.data.idempotencyKey, "payoff");
    if (result.ok) touch();
    return result;
  } catch (error) {
    return actionError(error);
  }
}

export async function saveRecipientAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = newRecipientSchema.extend({ id: z.string().min(1).max(40).optional() }).safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the recipient." };
    const userId = await actorId();
    const created = parsed.data;
    const recipientId = created.id ?? id("rcp");
    const { database } = await import("@/server/db");
    await database().insert(recipients).values({
      id: recipientId,
      userId,
      name: created.name,
      line1: created.addressLine1,
      line2: created.addressLine2 || null,
      city: created.city,
      state: created.state.toUpperCase(),
      postalCode: created.postalCode,
      bankName: created.bankName,
      routingNumber: created.routingNumber,
      accountNumber: created.accountNumber,
      lastPaidAt: null,
    });
    touch();
    return { ok: true, data: { id: recipientId } };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteRecipientAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = z.object({ id: z.string().min(1) }).safeParse(input);
    if (!parsed.success) return { ok: false, message: "That recipient isn't yours." };
    const userId = await actorId();
    const { database } = await import("@/server/db");
    const open = await database().select({ id: wires.id }).from(wires).where(and(eq(wires.userId, userId), eq(wires.recipientId, parsed.data.id), eq(wires.status, "pending"))).limit(1);
    if (open.length > 0) return { ok: false, message: "This recipient has a wire that hasn't settled." };
    await database().delete(recipients).where(and(eq(recipients.userId, userId), eq(recipients.id, parsed.data.id)));
    touch();
    return { ok: true, data: { id: parsed.data.id } };
  } catch (error) {
    return actionError(error);
  }
}

const profileSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  lastName: z.string().trim().min(1).max(40),
  businessName: z.string().trim().min(2).max(80),
});

export async function saveProfileAction(input: unknown): Promise<ActionResult<{ businessName: string }>> {
  try {
    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the profile." };
    const userId = await actorId();
    const { database } = await import("@/server/db");
    await database().update(profiles).set(parsed.data).where(eq(profiles.userId, userId));
    const client = await clerkClient();
    const current = await client.users.getUser(userId);
    await client.users.updateUser(userId, {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      unsafeMetadata: { ...current.unsafeMetadata, businessName: parsed.data.businessName },
    });
    touch();
    return { ok: true, data: { businessName: parsed.data.businessName } };
  } catch (error) {
    return actionError(error);
  }
}
