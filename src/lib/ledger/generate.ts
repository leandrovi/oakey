import { amortizationSchedule, monthlyPayment } from "@/lib/domain/amortization";
import { preapprovedTerms } from "@/lib/domain/offers";
import type { EntryDirection, EntryStatus } from "@/lib/ledger/balance";

/** The book is written against this clock so a new account always gets the same twelve months. */
export const BOOK_AS_OF = new Date("2026-11-05T15:30:00-05:00");

export const OPENING_CHECKING = 18_450_000;
export const OPENING_SAVINGS = 32_000_000;
export const CREDIT_LIMIT = 7_500_000;
export const CREDIT_APR_BPS = 1999;

export interface GeneratedEntry {
  id: string;
  userId: string;
  accountId: string;
  cardId: string | null;
  postedAt: string;
  description: string;
  counterparty: string;
  category: string;
  type: string;
  direction: EntryDirection;
  amount: number;
  status: EntryStatus;
  wireId: string | null;
}

export interface GeneratedAccount {
  id: string;
  userId: string;
  kind: "checking" | "savings" | "credit";
  name: string;
  mask: string;
  routingNumber: string;
  apyBps: number | null;
  creditLimitCents: number | null;
  aprBps: number | null;
  dueDate: string | null;
}

export interface GeneratedCard {
  id: string;
  userId: string;
  kind: "virtual" | "physical";
  nickname: string;
  cardholder: string;
  last4: string;
  expMonth: number;
  expYear: number;
  status: "active" | "frozen" | "lost" | "canceled";
  onlinePurchases: boolean;
  internationalPurchases: boolean;
  monthlyLimit: number;
  perTransactionLimit: number;
}

export interface GeneratedRecipient {
  id: string;
  userId: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  lastPaidAt: string | null;
}

export interface GeneratedWire {
  id: string;
  userId: string;
  idempotencyKey: string;
  fromAccountId: string;
  recipientId: string;
  amount: number;
  fee: number;
  memo: string;
  purpose: string;
  status: "pending" | "processing" | "completed" | "canceled" | "failed";
  createdAt: string;
  expectedSettlementDate: string;
  ledgerLockedAt: string | null;
  abaCheckedAt: string | null;
  fedwireSentAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
}

export interface GeneratedLoan {
  id: string;
  userId: string;
  offerId: string;
  name: string;
  principal: number;
  aprBps: number;
  termMonths: number;
  monthlyPayment: number;
  status: "pending" | "active" | "paid_off" | "canceled";
  requestedAt: string;
  schedule: ReturnType<typeof amortizationSchedule>;
}

export interface GeneratedOffer {
  id: string;
  userId: string;
  name: string;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  aprBps: number;
  expiresAt: string;
}

export interface GeneratedCredit {
  userId: string;
  score: number;
  updatedAt: string;
  factors: { name: string; impact: "high" | "medium" | "low"; rating: "excellent" | "good" | "fair" | "poor"; detail: string }[];
  history: { month: string; score: number }[];
}

export interface GeneratedBook {
  accounts: GeneratedAccount[];
  entries: GeneratedEntry[];
  cards: GeneratedCard[];
  recipients: GeneratedRecipient[];
  wires: GeneratedWire[];
  loans: GeneratedLoan[];
  offers: GeneratedOffer[];
  credit: GeneratedCredit;
}

export interface BookProfile {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  businessName: string;
}

/** FNV-1a. The same user id always grows the same book. */
export function seedFromUserId(userId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < userId.length; i++) {
    hash ^= userId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CLIENTS = ["Harbor Freight Labs", "Lumen Health", "Fieldstone Capital", "Copperline Media", "Atlas Robotics", "Bramble Foods"];
const SAAS: [string, number, number][] = [
  ["Figma", 4_500, 4_500], ["Slack", 21_000, 24_000], ["AWS", 120_000, 260_000], ["Google Workspace", 14_400, 16_800],
  ["Notion", 9_600, 9_600], ["GitHub", 8_400, 10_500], ["Vercel", 6_000, 18_000], ["Linear", 4_800, 4_800],
];
const CARD_SPEND: [string, string, number, number][] = [
  ["Delta Air Lines", "Travel", 28_000, 92_000], ["Hilton Hotels", "Travel", 21_000, 64_000], ["Uber", "Travel", 1_800, 6_500],
  ["Blue Bottle Coffee", "Meals", 900, 3_200], ["Sweetgreen", "Meals", 1_400, 9_800], ["Google Ads", "Marketing", 45_000, 180_000],
  ["LinkedIn Ads", "Marketing", 30_000, 90_000], ["WeWork", "Office", 25_000, 45_000], ["Staples", "Office", 2_400, 18_000],
  ["Apple Store", "Office", 129_900, 249_900],
];

interface Draft {
  accountId: string;
  cardId: string | null;
  at: Date;
  description: string;
  counterparty: string;
  category: string;
  type: string;
  direction: EntryDirection;
  amount: number;
  pending?: boolean;
  wireId?: string;
  pair?: string;
}

export function generateBook(profile: BookProfile, seed = seedFromUserId(profile.userId), now = BOOK_AS_OF): GeneratedBook {
  const prefix = seed.toString(36);
  const checkingId = `${prefix}_chk`;
  const savingsId = `${prefix}_sav`;
  const creditId = `${prefix}_crd`;
  const rand = mulberry32(seed);
  const between = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo));
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)] as T;
  const holder = `${profile.firstName} ${profile.lastName}`.trim();

  const cards: GeneratedCard[] = [
    { id: `${prefix}_card_01`, userId: profile.userId, kind: "physical", nickname: `${profile.firstName}'s card`, cardholder: holder, last4: String(1000 + (seed % 9000)).padStart(4, "0"), expMonth: 9, expYear: 2029, status: "active", onlinePurchases: true, internationalPurchases: true, monthlyLimit: 2_500_000, perTransactionLimit: 500_000 },
    { id: `${prefix}_card_02`, userId: profile.userId, kind: "virtual", nickname: "Ads & marketing", cardholder: holder, last4: String(1000 + ((seed >>> 4) % 9000)).padStart(4, "0"), expMonth: 3, expYear: 2028, status: "active", onlinePurchases: true, internationalPurchases: false, monthlyLimit: 1_500_000, perTransactionLimit: 300_000 },
    { id: `${prefix}_card_03`, userId: profile.userId, kind: "virtual", nickname: "Software", cardholder: holder, last4: String(1000 + ((seed >>> 8) % 9000)).padStart(4, "0"), expMonth: 11, expYear: 2027, status: "frozen", onlinePurchases: true, internationalPurchases: false, monthlyLimit: 500_000, perTransactionLimit: 200_000 },
    { id: `${prefix}_card_04`, userId: profile.userId, kind: "physical", nickname: "Treasury", cardholder: "Treasury", last4: String(1000 + ((seed >>> 12) % 9000)).padStart(4, "0"), expMonth: 6, expYear: 2029, status: "active", onlinePurchases: true, internationalPurchases: true, monthlyLimit: 800_000, perTransactionLimit: 250_000 },
  ];

  const drafts: Draft[] = [];
  const at = (y: number, m: number, d: number, h = 10) => new Date(Date.UTC(y, m, d, h + 5, between(0, 59)));
  for (let i = 11; i >= 0; i--) {
    const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const growth = 1 + (11 - i) * 0.03;
    const inMonth = (d: number) => d <= 28 && (i > 0 || d <= now.getUTCDate());
    for (let k = 0; k < between(3, 5); k++) {
      const d = between(2, 27);
      if (!inMonth(d)) continue;
      const client = pick(CLIENTS);
      drafts.push({ accountId: checkingId, cardId: null, at: at(y, m, d), description: `ACH credit ${client}`, counterparty: client, category: "Revenue", type: "ach", direction: "credit", amount: Math.round(between(1_200_000, 4_200_000) * growth) });
    }
    for (const d of [1, 15]) {
      if (inMonth(d)) drafts.push({ accountId: checkingId, cardId: null, at: at(y, m, d, 8), description: "Gusto payroll", counterparty: "Gusto", category: "Payroll", type: "ach", direction: "debit", amount: between(2_700_000, 2_950_000) });
    }
    if (inMonth(1)) drafts.push({ accountId: checkingId, cardId: null, at: at(y, m, 1, 9), description: "Rent, 88 Harbor St", counterparty: "Pier 88 Properties", category: "Rent", type: "ach", direction: "debit", amount: 650_000 });
    if (inMonth(3)) {
      drafts.push({ accountId: checkingId, cardId: null, at: at(y, m, 3), description: "Transfer to Savings", counterparty: "Oakey Savings", category: "Transfers", type: "internal", direction: "debit", amount: 500_000 });
      drafts.push({ accountId: savingsId, cardId: null, at: at(y, m, 3), description: "Transfer from Checking", counterparty: "Oakey Checking", category: "Transfers", type: "internal", direction: "credit", amount: 500_000 });
    }
    if (inMonth(28)) drafts.push({ accountId: savingsId, cardId: null, at: at(y, m, 28, 2), description: "Interest earned", counterparty: "Oakey", category: "Interest", type: "interest", direction: "credit", amount: between(14_000, 19_000) });
    if (inMonth(22)) {
      const payment = between(180_000, 420_000);
      const pair = `${y}-${m}-card`;
      drafts.push({ accountId: checkingId, cardId: null, at: at(y, m, 22), description: "Card balance payment", counterparty: "Oakey Card", category: "Transfers", type: "internal", direction: "debit", amount: payment, pair });
      drafts.push({ accountId: creditId, cardId: null, at: at(y, m, 22), description: "Payment from Checking", counterparty: "Oakey Checking", category: "Transfers", type: "internal", direction: "credit", amount: payment, pair });
    }
    if (m % 3 === 0 && inMonth(15)) drafts.push({ accountId: checkingId, cardId: null, at: at(y, m, 15, 11), description: "IRS estimated tax", counterparty: "US Treasury", category: "Taxes", type: "ach", direction: "debit", amount: between(1_800_000, 2_400_000) });
    if (inMonth(10)) drafts.push({ accountId: checkingId, cardId: null, at: at(y, m, 10, 13), description: "Wire to Studio Marrow", counterparty: "Studio Marrow LLC", category: "Software", type: "wire", direction: "debit", amount: between(400_000, 900_000) });
    for (const [name, lo, hi] of SAAS) {
      const d = between(4, 26);
      if (inMonth(d)) drafts.push({ accountId: creditId, cardId: cards[2]!.id, at: at(y, m, d), description: name, counterparty: name, category: "Software", type: "card", direction: "debit", amount: between(lo, hi) });
    }
    for (let k = 0; k < between(10, 16); k++) {
      const [name, category, lo, hi] = pick(CARD_SPEND);
      const d = between(1, 28);
      if (!inMonth(d)) continue;
      const card = category === "Marketing" ? cards[1]! : rand() > 0.3 ? cards[0]! : cards[3]!;
      drafts.push({ accountId: creditId, cardId: card.id, at: at(y, m, d, between(8, 20)), description: name, counterparty: name, category, type: "card", direction: "debit", amount: between(lo, hi) });
    }
  }

  const dated = drafts.filter((draft) => draft.at.getTime() <= now.getTime());
  dated.sort((a, b) => a.at.getTime() - b.at.getTime() || a.accountId.localeCompare(b.accountId));
  let cardOwed = 0;
  for (const draft of dated) {
    if (draft.accountId !== creditId) continue;
    if (draft.direction === "debit") cardOwed += draft.amount;
    if (draft.direction === "credit" && draft.pair) {
      const pay = Math.min(draft.amount, cardOwed);
      draft.amount = pay;
      const checkingSide = dated.find((row) => row.pair === draft.pair && row.accountId === checkingId);
      if (checkingSide) checkingSide.amount = pay;
      cardOwed -= pay;
    }
  }
  const kept = dated.filter((draft) => draft.amount > 0);
  kept.filter((draft) => draft.type === "card").sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 3).forEach((draft) => {
    draft.pending = true;
  });

  const openingAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1, 12, 0));
  const entries: GeneratedEntry[] = [
    { id: `${prefix}_open_chk`, userId: profile.userId, accountId: checkingId, cardId: null, postedAt: openingAt.toISOString(), description: "Opening balance", counterparty: "Oakey", category: "Transfers", type: "internal", direction: "credit", amount: OPENING_CHECKING, status: "posted", wireId: null },
    { id: `${prefix}_open_sav`, userId: profile.userId, accountId: savingsId, cardId: null, postedAt: openingAt.toISOString(), description: "Opening balance", counterparty: "Oakey", category: "Transfers", type: "internal", direction: "credit", amount: OPENING_SAVINGS, status: "posted", wireId: null },
  ];
  kept.forEach((draft, index) => {
    entries.push({
      id: `${prefix}_txn_${String(index + 1).padStart(5, "0")}`,
      userId: profile.userId,
      accountId: draft.accountId,
      cardId: draft.cardId,
      postedAt: draft.at.toISOString(),
      description: draft.description,
      counterparty: draft.counterparty,
      category: draft.category,
      type: draft.type,
      direction: draft.direction,
      amount: draft.amount,
      status: draft.pending ? "pending" : "posted",
      wireId: draft.wireId ?? null,
    });
  });

  const pendingWireId = `${prefix}_wire_pending`;
  const pendingAt = now.toISOString();
  entries.push(
    { id: `${prefix}_hold_amt`, userId: profile.userId, accountId: checkingId, cardId: null, postedAt: pendingAt, description: "Wire to Kestrel Legal PC", counterparty: "Kestrel Legal PC", category: "Transfers", type: "wire", direction: "debit", amount: 1_250_000, status: "pending", wireId: pendingWireId },
    { id: `${prefix}_hold_fee`, userId: profile.userId, accountId: checkingId, cardId: null, postedAt: pendingAt, description: "Wire fee", counterparty: "Kestrel Legal PC", category: "Fees", type: "fee", direction: "debit", amount: 1_500, status: "pending", wireId: pendingWireId },
  );

  const recipients: GeneratedRecipient[] = [
    { id: `${prefix}_rcp_01`, userId: profile.userId, name: "Studio Marrow LLC", line1: "410 Bedford Ave", line2: null, city: "Brooklyn", state: "NY", postalCode: "11249", bankName: "Chase", routingNumber: "021000021", accountNumber: "000123456789", lastPaidAt: "2026-10-10T18:12:00Z" },
    { id: `${prefix}_rcp_02`, userId: profile.userId, name: "Pier 88 Properties", line1: "88 Harbor St", line2: null, city: "Boston", state: "MA", postalCode: "02210", bankName: "Bank of America", routingNumber: "026009593", accountNumber: "004455667788", lastPaidAt: "2026-11-01T14:00:00Z" },
    { id: `${prefix}_rcp_03`, userId: profile.userId, name: "Kestrel Legal PC", line1: "1 Market St", line2: "Suite 900", city: "San Francisco", state: "CA", postalCode: "94105", bankName: "Wells Fargo", routingNumber: "121000248", accountNumber: "7788990011", lastPaidAt: null },
  ];

  const wires: GeneratedWire[] = [
    { id: pendingWireId, userId: profile.userId, idempotencyKey: `${prefix}_idem_pending`, fromAccountId: checkingId, recipientId: recipients[2]!.id, amount: 1_250_000, fee: 1_500, memo: "Retainer Q4", purpose: "Legal services", status: "pending", createdAt: pendingAt, expectedSettlementDate: "2026-11-05", ledgerLockedAt: pendingAt, abaCheckedAt: pendingAt, fedwireSentAt: null, completedAt: null, failedAt: null },
    { id: `${prefix}_wire_done`, userId: profile.userId, idempotencyKey: `${prefix}_idem_done`, fromAccountId: checkingId, recipientId: recipients[0]!.id, amount: 640_000, fee: 1_500, memo: "Invoice 2210", purpose: "Contractor payment", status: "completed", createdAt: "2026-10-10T18:12:00Z", expectedSettlementDate: "2026-10-10", ledgerLockedAt: "2026-10-10T18:12:00Z", abaCheckedAt: "2026-10-10T18:12:00Z", fedwireSentAt: "2026-10-10T18:20:00Z", completedAt: "2026-10-10T18:40:00Z", failedAt: null },
    { id: `${prefix}_wire_failed`, userId: profile.userId, idempotencyKey: `${prefix}_idem_failed`, fromAccountId: checkingId, recipientId: recipients[1]!.id, amount: 1_300_000, fee: 1_500, memo: "Security deposit", purpose: "Rent", status: "failed", createdAt: "2026-09-02T15:40:00Z", expectedSettlementDate: "2026-09-02", ledgerLockedAt: "2026-09-02T15:40:00Z", abaCheckedAt: "2026-09-02T15:40:00Z", fedwireSentAt: null, completedAt: null, failedAt: "2026-09-02T16:05:00Z" },
  ];

  const inflow = new Map<string, number>();
  for (const entry of entries) {
    if (entry.accountId !== checkingId || entry.type === "internal" || entry.status !== "posted" || entry.direction !== "credit") continue;
    const key = entry.postedAt.slice(0, 7);
    inflow.set(key, (inflow.get(key) ?? 0) + entry.amount);
  }
  const avgInflow = Math.round([...inflow.values()].reduce((a, b) => a + b, 0) / Math.max(inflow.size, 1) * 0.35);
  const score = 680 + (seed % 120);
  const terms = preapprovedTerms(score, avgInflow as never);
  const offers: GeneratedOffer[] = terms
    ? [
        { id: `${prefix}_offer_01`, userId: profile.userId, name: "Growth term loan", maxAmount: terms.maxAmount, minTermMonths: 12, maxTermMonths: terms.maxTermMonths, aprBps: terms.apr, expiresAt: "2026-12-05" },
        { id: `${prefix}_offer_02`, userId: profile.userId, name: "Working capital line", maxAmount: Math.round(terms.maxAmount / 2 / 100_000) * 100_000, minTermMonths: 6, maxTermMonths: 18, aprBps: terms.apr + 200, expiresAt: "2026-11-30" },
      ]
    : [];

  const principal = 6_000_000;
  const loanApr = 899;
  const schedule = amortizationSchedule(principal as never, loanApr as never, 24, "2026-04-05" as never).map((row) => ({
    ...row,
    paid: row.dueDate < "2026-11-05",
  }));
  const loans: GeneratedLoan[] = [
    { id: `${prefix}_loan_01`, userId: profile.userId, offerId: `${prefix}_offer_00`, name: "Equipment loan", principal, aprBps: loanApr, termMonths: 24, monthlyPayment: monthlyPayment(principal as never, loanApr as never, 24), status: "active", requestedAt: "2026-03-01T15:00:00Z", schedule },
  ];

  const historyScores = [698, 702, 705, 711, 709, 716, 722, 726, 731, 735, 739, score];
  const credit: GeneratedCredit = {
    userId: profile.userId,
    score,
    updatedAt: "2026-11-01",
    factors: [
      { name: "Payment history", impact: "high", rating: "excellent", detail: "No late payments in 24 months." },
      { name: "Credit utilization", impact: "high", rating: "good", detail: "You use a modest share of available credit." },
      { name: "Cash flow consistency", impact: "medium", rating: "excellent", detail: "Revenue landed every month for a year." },
      { name: "Business age", impact: "medium", rating: "fair", detail: "Open for 3 years. Scores rise after 5." },
      { name: "Recent inquiries", impact: "low", rating: "good", detail: "1 hard inquiry in the last 12 months." },
    ],
    history: historyScores.map((value, index) => ({
      month: new Date(Date.UTC(2025, 11 + index, 1)).toISOString().slice(0, 10),
      score: value,
    })),
  };

  const accounts: GeneratedAccount[] = [
    { id: checkingId, userId: profile.userId, kind: "checking", name: "Operating", mask: "4410", routingNumber: "021000021", apyBps: null, creditLimitCents: null, aprBps: null, dueDate: null },
    { id: savingsId, userId: profile.userId, kind: "savings", name: "Reserve", mask: "8832", routingNumber: "021000021", apyBps: 410, creditLimitCents: null, aprBps: null, dueDate: null },
    { id: creditId, userId: profile.userId, kind: "credit", name: "Oakey Card", mask: "0000", routingNumber: "021000021", apyBps: null, creditLimitCents: CREDIT_LIMIT, aprBps: CREDIT_APR_BPS, dueDate: "2026-11-22" },
  ];

  return { accounts, entries, cards, recipients, wires, loans, offers, credit };
}
