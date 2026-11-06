import type {
  Card,
  Cents,
  CreditCardAccount,
  CreditScore,
  DepositAccount,
  IsoDate,
  IsoDateTime,
  Loan,
  LoanOffer,
  Recipient,
  Transaction,
  User,
  Wire,
} from "@/lib/domain/types";
import { availableBalance, owedBalance, signedAmount, type BalanceEntry } from "@/lib/ledger/balance";
import { BOOK_AS_OF, type BookProfile, type GeneratedBook, type GeneratedEntry } from "@/lib/ledger/generate";

export interface BankWire extends Wire {
  ledgerLockedAt: IsoDateTime | null;
  abaCheckedAt: IsoDateTime | null;
  fedwireSentAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  failedAt: IsoDateTime | null;
}

export interface BankSnapshot {
  user: User;
  now: string;
  accounts: DepositAccount[];
  transactions: Transaction[];
  cards: Card[];
  creditCard: CreditCardAccount;
  creditScore: CreditScore;
  loans: Loan[];
  offers: LoanOffer[];
  wires: BankWire[];
  recipients: Recipient[];
}

const STATEMENT_CLOSE = "2026-10-22";

function asCents(value: number): Cents {
  return value as Cents;
}

function entryStatus(status: GeneratedEntry["status"]): Transaction["status"] {
  if (status === "posted" || status === "pending") return status;
  return "failed";
}

/** Turns ledger rows into the shapes the screens already render. Balances are folded here. */
export function projectBook(profile: BookProfile & { createdAt: string }, book: GeneratedBook, now = BOOK_AS_OF): BankSnapshot {
  const credit = book.accounts.find((account) => account.kind === "credit");
  const creditId = credit?.id ?? "";
  const running = new Map<string, number>();
  const balanceAfter = new Map<string, number>();
  const depositIds = new Set(book.accounts.filter((account) => account.kind !== "credit").map((account) => account.id));
  const ordered = [...book.entries].sort((a, b) => a.postedAt.localeCompare(b.postedAt) || a.id.localeCompare(b.id));
  for (const entry of ordered) {
    if (entry.status !== "posted" || !depositIds.has(entry.accountId)) continue;
    const next = (running.get(entry.accountId) ?? 0) + signedAmount(entry);
    running.set(entry.accountId, next);
    balanceAfter.set(entry.id, next);
  }

  const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const spentByCard = new Map<string, number>();
  for (const entry of book.entries) {
    if (!entry.cardId || entry.direction !== "debit" || (entry.status !== "posted" && entry.status !== "pending")) continue;
    if (!entry.postedAt.startsWith(monthKey)) continue;
    spentByCard.set(entry.cardId, (spentByCard.get(entry.cardId) ?? 0) + entry.amount);
  }

  const beforeClose = book.entries.filter((entry) => entry.accountId === creditId && entry.postedAt.slice(0, 10) < STATEMENT_CLOSE);
  const paymentsAfter = book.entries
    .filter((entry) => entry.accountId === creditId && entry.status === "posted" && entry.direction === "credit" && entry.postedAt.slice(0, 10) >= STATEMENT_CLOSE)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const owedBefore = -beforeClose.filter((entry) => entry.status === "posted").reduce((sum, entry) => sum + signedAmount(entry), 0);
  const statementBalance = Math.max(0, owedBefore - paymentsAfter);
  const minimumDue = statementBalance > 0 ? Math.max(2_500, Math.round(statementBalance * 0.02)) : 0;

  const accounts: DepositAccount[] = book.accounts
    .filter((account) => account.kind !== "credit")
    .map((account) => ({
      id: account.id as DepositAccount["id"],
      kind: account.kind as DepositAccount["kind"],
      name: account.name,
      mask: account.mask,
      routingNumber: account.routingNumber as DepositAccount["routingNumber"],
      balance: asCents(availableBalance(book.entries, account.id)),
      apy: account.apyBps == null ? null : (account.apyBps as DepositAccount["apy"]),
    }));

  const transactions: Transaction[] = ordered.map((entry) => ({
    id: entry.id as Transaction["id"],
    accountId: (entry.cardId ?? entry.accountId) as Transaction["accountId"],
    postedAt: entry.postedAt as IsoDateTime,
    description: entry.description,
    counterparty: entry.counterparty,
    category: entry.category as Transaction["category"],
    type: entry.type as Transaction["type"],
    direction: entry.direction,
    amount: asCents(entry.amount),
    status: entryStatus(entry.status),
    balanceAfter: balanceAfter.has(entry.id) ? asCents(balanceAfter.get(entry.id)!) : null,
  }));

  return {
    user: {
      id: profile.userId as User["id"],
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email,
      businessName: profile.businessName,
      createdAt: profile.createdAt as IsoDateTime,
    },
    now: now.toISOString(),
    accounts,
    transactions,
    cards: book.cards.map((card) => ({
      id: card.id as Card["id"],
      kind: card.kind,
      nickname: card.nickname,
      cardholder: card.cardholder,
      last4: card.last4,
      expMonth: card.expMonth,
      expYear: card.expYear,
      status: card.status,
      controls: {
        onlinePurchases: card.onlinePurchases,
        internationalPurchases: card.internationalPurchases,
        monthlyLimit: asCents(card.monthlyLimit),
        perTransactionLimit: asCents(card.perTransactionLimit),
      },
      spentThisMonth: asCents(spentByCard.get(card.id) ?? 0),
    })),
    creditCard: {
      limit: asCents(credit?.creditLimitCents ?? 0),
      balance: asCents(owedBalance(book.entries as BalanceEntry[], creditId)),
      statementBalance: asCents(statementBalance),
      minimumDue: asCents(minimumDue),
      dueDate: (credit?.dueDate ?? "2026-11-22") as IsoDate,
      apr: (credit?.aprBps ?? 0) as CreditCardAccount["apr"],
    },
    creditScore: {
      score: book.credit.score,
      updatedAt: book.credit.updatedAt as IsoDate,
      factors: book.credit.factors,
      history: book.credit.history.map((point) => ({ month: point.month as IsoDate, score: point.score })),
    },
    loans: book.loans.map((loan) => ({
      id: loan.id as Loan["id"],
      offerId: loan.offerId as Loan["offerId"],
      name: loan.name,
      principal: asCents(loan.principal),
      apr: loan.aprBps as Loan["apr"],
      termMonths: loan.termMonths,
      monthlyPayment: asCents(loan.monthlyPayment),
      status: loan.status,
      requestedAt: loan.requestedAt as IsoDateTime,
      schedule: loan.schedule,
    })),
    offers: book.offers.map((offer) => ({
      id: offer.id as LoanOffer["id"],
      name: offer.name,
      maxAmount: asCents(offer.maxAmount),
      minTermMonths: offer.minTermMonths,
      maxTermMonths: offer.maxTermMonths,
      apr: offer.aprBps as LoanOffer["apr"],
      expiresAt: offer.expiresAt as IsoDate,
    })),
    wires: book.wires.map((wire) => ({
      id: wire.id as BankWire["id"],
      idempotencyKey: wire.idempotencyKey,
      fromAccountId: wire.fromAccountId as BankWire["fromAccountId"],
      recipientId: wire.recipientId as BankWire["recipientId"],
      amount: asCents(wire.amount),
      fee: asCents(wire.fee),
      memo: wire.memo,
      purpose: wire.purpose,
      status: wire.status,
      createdAt: wire.createdAt as IsoDateTime,
      expectedSettlementDate: wire.expectedSettlementDate as IsoDate,
      ledgerLockedAt: wire.ledgerLockedAt as IsoDateTime | null,
      abaCheckedAt: wire.abaCheckedAt as IsoDateTime | null,
      fedwireSentAt: wire.fedwireSentAt as IsoDateTime | null,
      completedAt: wire.completedAt as IsoDateTime | null,
      failedAt: wire.failedAt as IsoDateTime | null,
    })),
    recipients: book.recipients.map((recipient) => ({
      id: recipient.id as Recipient["id"],
      name: recipient.name,
      address: {
        line1: recipient.line1,
        line2: recipient.line2 ?? undefined,
        city: recipient.city,
        state: recipient.state,
        postalCode: recipient.postalCode,
      },
      bankName: recipient.bankName,
      routingNumber: recipient.routingNumber as Recipient["routingNumber"],
      accountNumber: recipient.accountNumber,
      lastPaidAt: recipient.lastPaidAt as IsoDateTime | null,
    })),
  };
}
