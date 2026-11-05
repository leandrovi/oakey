import { amortizationSchedule, monthlyPayment } from "@/lib/domain/amortization";
import { preapprovedTerms } from "@/lib/domain/offers";
import type {
  AccountId, BasisPoints, Card, CardId, Cents, CreditCardAccount, CreditScore, DepositAccount, IsoDate, IsoDateTime,
  Loan, LoanId, LoanOffer, LoanOfferId, Recipient, RecipientId, RoutingNumber, Transaction, TransactionCategory,
  TransactionDirection, TransactionId, TransactionType, User, UserId, Wire, WireId,
} from "@/lib/domain/types";

/** Fixed clock so every render and test sees the same 12 months. */
export const NOW = new Date("2026-11-05T15:30:00-05:00");

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iso = (d: Date) => d.toISOString() as IsoDateTime;
const day = (d: Date) => d.toISOString().slice(0, 10) as IsoDate;

export const CHECKING_ID = "acc_chk_01" as AccountId;
export const SAVINGS_ID = "acc_sav_01" as AccountId;
const ROUTING = "021000021" as RoutingNumber;

interface Draft {
  accountId: AccountId | CardId;
  at: Date;
  description: string;
  counterparty: string;
  category: TransactionCategory;
  type: TransactionType;
  direction: TransactionDirection;
  amount: number;
  pending?: boolean;
}

const CLIENTS = ["Harbor Freight Labs", "Lumen Health", "Fieldstone Capital", "Copperline Media", "Atlas Robotics", "Bramble Foods"];
const SAAS: [string, number, number][] = [
  ["Figma", 4_500, 4_500], ["Slack", 21_000, 24_000], ["AWS", 120_000, 260_000], ["Google Workspace", 14_400, 16_800],
  ["Notion", 9_600, 9_600], ["GitHub", 8_400, 10_500], ["Vercel", 6_000, 18_000], ["Linear", 4_800, 4_800],
];
const CARD_SPEND: [string, TransactionCategory, number, number][] = [
  ["Delta Air Lines", "Travel", 28_000, 92_000], ["Hilton Hotels", "Travel", 21_000, 64_000], ["Uber", "Travel", 1_800, 6_500],
  ["Blue Bottle Coffee", "Meals", 900, 3_200], ["Sweetgreen", "Meals", 1_400, 9_800], ["Google Ads", "Marketing", 45_000, 180_000],
  ["LinkedIn Ads", "Marketing", 30_000, 90_000], ["WeWork", "Office", 25_000, 45_000], ["Staples", "Office", 2_400, 18_000],
  ["Apple Store", "Office", 129_900, 249_900],
];

function generate(): { drafts: Draft[]; cards: Card[] } {
  const rand = mulberry32(20261105);
  const between = (lo: number, hi: number) => Math.round(lo + rand() * (hi - lo));
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const cards: Card[] = [
    { id: "card_01" as CardId, kind: "physical", nickname: "Alex's card", cardholder: "Alex Rivera", last4: "4821", expMonth: 9, expYear: 2029, status: "active",
      controls: { onlinePurchases: true, internationalPurchases: true, monthlyLimit: 2_500_000 as Cents, perTransactionLimit: 500_000 as Cents }, spentThisMonth: 0 as Cents },
    { id: "card_02" as CardId, kind: "virtual", nickname: "Ads & marketing", cardholder: "Alex Rivera", last4: "1937", expMonth: 3, expYear: 2028, status: "active",
      controls: { onlinePurchases: true, internationalPurchases: false, monthlyLimit: 1_500_000 as Cents, perTransactionLimit: 300_000 as Cents }, spentThisMonth: 0 as Cents },
    { id: "card_03" as CardId, kind: "virtual", nickname: "Software", cardholder: "Alex Rivera", last4: "6604", expMonth: 11, expYear: 2027, status: "frozen",
      controls: { onlinePurchases: true, internationalPurchases: false, monthlyLimit: 500_000 as Cents, perTransactionLimit: 200_000 as Cents }, spentThisMonth: 0 as Cents },
    { id: "card_04" as CardId, kind: "physical", nickname: "Jordan Lee", cardholder: "Jordan Lee", last4: "2290", expMonth: 6, expYear: 2029, status: "active",
      controls: { onlinePurchases: true, internationalPurchases: true, monthlyLimit: 800_000 as Cents, perTransactionLimit: 250_000 as Cents }, spentThisMonth: 0 as Cents },
  ];
  const drafts: Draft[] = [];
  const at = (y: number, m: number, d: number, h = 10) => new Date(Date.UTC(y, m, d, h + 5, between(0, 59)));
  for (let i = 11; i >= 0; i--) {
    const base = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth() - i, 1));
    const y = base.getUTCFullYear();
    const m = base.getUTCMonth();
    const growth = 1 + (11 - i) * 0.03;
    const inMonth = (d: number) => d <= 28 && (i > 0 || d <= NOW.getUTCDate());
    for (let k = 0; k < between(3, 5); k++) {
      const d = between(2, 27);
      if (!inMonth(d)) continue;
      const client = pick(CLIENTS);
      drafts.push({ accountId: CHECKING_ID, at: at(y, m, d), description: `ACH credit ${client}`, counterparty: client, category: "Revenue", type: "ach", direction: "credit", amount: Math.round(between(1_200_000, 4_200_000) * growth) });
    }
    for (const d of [1, 15]) if (inMonth(d)) drafts.push({ accountId: CHECKING_ID, at: at(y, m, d, 8), description: "Gusto payroll", counterparty: "Gusto", category: "Payroll", type: "ach", direction: "debit", amount: between(2_700_000, 2_950_000) });
    if (inMonth(1)) drafts.push({ accountId: CHECKING_ID, at: at(y, m, 1, 9), description: "Rent, 88 Harbor St", counterparty: "Pier 88 Properties", category: "Rent", type: "ach", direction: "debit", amount: 650_000 });
    if (inMonth(3)) drafts.push({ accountId: CHECKING_ID, at: at(y, m, 3), description: "Transfer to Savings", counterparty: "Oakey Savings", category: "Transfers", type: "internal", direction: "debit", amount: 500_000 });
    if (inMonth(3)) drafts.push({ accountId: SAVINGS_ID, at: at(y, m, 3), description: "Transfer from Checking", counterparty: "Oakey Checking", category: "Transfers", type: "internal", direction: "credit", amount: 500_000 });
    if (inMonth(28)) drafts.push({ accountId: SAVINGS_ID, at: at(y, m, 28, 2), description: "Interest earned", counterparty: "Oakey", category: "Interest", type: "interest", direction: "credit", amount: between(14_000, 19_000) });
    if (inMonth(22)) drafts.push({ accountId: CHECKING_ID, at: at(y, m, 22), description: "Card balance payment", counterparty: "Oakey Card", category: "Transfers", type: "internal", direction: "debit", amount: between(900_000, 1_600_000) });
    if (m % 3 === 0 && inMonth(15)) drafts.push({ accountId: CHECKING_ID, at: at(y, m, 15, 11), description: "IRS estimated tax", counterparty: "US Treasury", category: "Taxes", type: "ach", direction: "debit", amount: between(1_800_000, 2_400_000) });
    if (inMonth(10)) drafts.push({ accountId: CHECKING_ID, at: at(y, m, 10, 13), description: "Wire to Studio Marrow", counterparty: "Studio Marrow LLC", category: "Software", type: "wire", direction: "debit", amount: between(400_000, 900_000) });
    for (const [name, lo, hi] of SAAS) {
      const d = between(4, 26);
      if (inMonth(d)) drafts.push({ accountId: "card_03" as CardId, at: at(y, m, d), description: name, counterparty: name, category: "Software", type: "card", direction: "debit", amount: between(lo, hi) });
    }
    for (let k = 0; k < between(10, 16); k++) {
      const [name, category, lo, hi] = pick(CARD_SPEND);
      const d = between(1, 28);
      if (!inMonth(d)) continue;
      const card = category === "Marketing" ? "card_02" : rand() > 0.3 ? "card_01" : "card_04";
      drafts.push({ accountId: card as CardId, at: at(y, m, d, between(8, 20)), description: name, counterparty: name, category, type: "card", direction: "debit", amount: between(lo, hi) });
    }
  }
  const recentCard = drafts.filter((d) => d.type === "card").sort((a, b) => b.at.getTime() - a.at.getTime());
  recentCard.slice(0, 3).forEach((d) => (d.pending = true));
  return { drafts, cards };
}

const OPENING: Record<string, number> = { [CHECKING_ID]: 18_450_000, [SAVINGS_ID]: 32_000_000 };

function buildLedger() {
  const { drafts, cards } = generate();
  drafts.sort((a, b) => a.at.getTime() - b.at.getTime());
  const running: Record<string, number> = { ...OPENING };
  const transactions: Transaction[] = drafts.map((d, i) => {
    const signed = d.direction === "credit" ? d.amount : -d.amount;
    let balanceAfter: Cents | null = null;
    if (!d.pending && d.accountId in running) {
      running[d.accountId] += signed;
      balanceAfter = running[d.accountId] as Cents;
    }
    return {
      id: `txn_${String(i + 1).padStart(5, "0")}` as TransactionId,
      accountId: d.accountId, postedAt: iso(d.at), description: d.description, counterparty: d.counterparty,
      category: d.category, type: d.type, direction: d.direction, amount: d.amount as Cents,
      status: d.pending ? "pending" : "posted", balanceAfter,
    };
  });
  transactions.reverse();
  const monthStart = new Date(Date.UTC(NOW.getUTCFullYear(), NOW.getUTCMonth(), 1));
  for (const c of cards) {
    c.spentThisMonth = transactions
      .filter((t) => t.accountId === c.id && new Date(t.postedAt) >= monthStart)
      .reduce((s, t) => s + t.amount, 0) as Cents;
  }
  return { transactions, cards, balances: running };
}

const ledger = buildLedger();

export const user: User = {
  id: "user_01" as UserId, firstName: "Alex", lastName: "Rivera", email: "alex@northwindstudio.co",
  businessName: "Northwind Studio", createdAt: "2025-10-02T14:00:00Z" as IsoDateTime,
};

export const accounts: DepositAccount[] = [
  { id: CHECKING_ID, kind: "checking", name: "Operating", mask: "4410", routingNumber: ROUTING, balance: ledger.balances[CHECKING_ID] as Cents, apy: null },
  { id: SAVINGS_ID, kind: "savings", name: "Reserve", mask: "8832", routingNumber: ROUTING, balance: ledger.balances[SAVINGS_ID] as Cents, apy: 410 as BasisPoints },
];

export const transactions = ledger.transactions;
export const cards = ledger.cards;

const unpaidCardSpend = transactions.filter((t) => t.type === "card" && new Date(t.postedAt) > new Date(Date.UTC(2026, 9, 22))).reduce((s, t) => s + t.amount, 0);
export const creditCard: CreditCardAccount = {
  limit: 7_500_000 as Cents, balance: unpaidCardSpend as Cents, statementBalance: Math.round(unpaidCardSpend * 0.7) as Cents,
  minimumDue: Math.max(2_500, Math.round(unpaidCardSpend * 0.7 * 0.02)) as Cents, dueDate: "2026-11-22" as IsoDate, apr: 1999 as BasisPoints,
};

export const recipients: Recipient[] = [
  { id: "rcp_01" as RecipientId, name: "Studio Marrow LLC", bankName: "Chase", routingNumber: "021000021" as RoutingNumber, accountNumber: "000123456789",
    address: { line1: "410 Bedford Ave", city: "Brooklyn", state: "NY", postalCode: "11249" }, lastPaidAt: "2026-10-10T18:12:00Z" as IsoDateTime },
  { id: "rcp_02" as RecipientId, name: "Pier 88 Properties", bankName: "Bank of America", routingNumber: "026009593" as RoutingNumber, accountNumber: "004455667788",
    address: { line1: "88 Harbor St", city: "Boston", state: "MA", postalCode: "02210" }, lastPaidAt: "2026-11-01T14:00:00Z" as IsoDateTime },
  { id: "rcp_03" as RecipientId, name: "Kestrel Legal PC", bankName: "Wells Fargo", routingNumber: "121000248" as RoutingNumber, accountNumber: "7788990011",
    address: { line1: "1 Market St", line2: "Suite 900", city: "San Francisco", state: "CA", postalCode: "94105" }, lastPaidAt: null },
];

export const wires: Wire[] = [
  { id: "wire_03" as WireId, idempotencyKey: "idem_03", fromAccountId: CHECKING_ID, recipientId: "rcp_03" as RecipientId, amount: 1_250_000 as Cents, fee: 1500 as Cents,
    memo: "Retainer Q4", purpose: "Legal services", status: "pending", createdAt: "2026-11-05T19:02:00Z" as IsoDateTime, expectedSettlementDate: "2026-11-05" as IsoDate },
  { id: "wire_02" as WireId, idempotencyKey: "idem_02", fromAccountId: CHECKING_ID, recipientId: "rcp_01" as RecipientId, amount: 640_000 as Cents, fee: 1500 as Cents,
    memo: "Invoice 2210", purpose: "Contractor payment", status: "completed", createdAt: "2026-10-10T18:12:00Z" as IsoDateTime, expectedSettlementDate: "2026-10-10" as IsoDate },
  { id: "wire_01" as WireId, idempotencyKey: "idem_01", fromAccountId: CHECKING_ID, recipientId: "rcp_02" as RecipientId, amount: 1_300_000 as Cents, fee: 1500 as Cents,
    memo: "Security deposit", purpose: "Rent", status: "failed", createdAt: "2026-09-02T15:40:00Z" as IsoDateTime, expectedSettlementDate: "2026-09-02" as IsoDate },
];

export const creditScore: CreditScore = {
  score: 742, updatedAt: "2026-11-01" as IsoDate,
  factors: [
    { name: "Payment history", impact: "high", rating: "excellent", detail: "No late payments in 24 months." },
    { name: "Credit utilization", impact: "high", rating: "good", detail: "You use 18% of available credit. Under 10% is ideal." },
    { name: "Cash flow consistency", impact: "medium", rating: "excellent", detail: "Revenue landed every month for a year." },
    { name: "Business age", impact: "medium", rating: "fair", detail: "Open for 3 years. Scores rise after 5." },
    { name: "Recent inquiries", impact: "low", rating: "good", detail: "1 hard inquiry in the last 12 months." },
  ],
  history: Array.from({ length: 12 }, (_, i) => ({
    month: day(new Date(Date.UTC(2025, 11 + i, 1))),
    score: [698, 702, 705, 711, 709, 716, 722, 726, 731, 735, 739, 742][i],
  })),
};

const netByMonth = new Map<string, number>();
for (const t of transactions) {
  if (t.accountId !== CHECKING_ID || t.type === "internal") continue;
  const k = t.postedAt.slice(0, 7);
  netByMonth.set(k, (netByMonth.get(k) ?? 0) + (t.direction === "credit" ? t.amount : 0));
}
const avgInflow = Math.round([...netByMonth.values()].reduce((a, b) => a + b, 0) / Math.max(netByMonth.size, 1) * 0.35) as Cents;
const terms = preapprovedTerms(creditScore.score, avgInflow);

export const loanOffers: LoanOffer[] = terms
  ? [
      { id: "offer_01" as LoanOfferId, name: "Growth term loan", maxAmount: terms.maxAmount, minTermMonths: 12, maxTermMonths: terms.maxTermMonths, apr: terms.apr, expiresAt: "2026-12-05" as IsoDate },
      { id: "offer_02" as LoanOfferId, name: "Working capital line", maxAmount: Math.round(terms.maxAmount / 2 / 100_000) * 100_000 as Cents, minTermMonths: 6, maxTermMonths: 18, apr: (terms.apr + 200) as BasisPoints, expiresAt: "2026-11-30" as IsoDate },
    ]
  : [];

function activeLoan(): Loan {
  const principal = 6_000_000 as Cents;
  const apr = 899 as BasisPoints;
  const schedule = amortizationSchedule(principal, apr, 24, "2026-04-05" as IsoDate).map((r) => ({ ...r, paid: r.dueDate < day(NOW) }));
  return { id: "loan_01" as LoanId, offerId: "offer_00" as LoanOfferId, name: "Equipment loan", principal, apr, termMonths: 24,
    monthlyPayment: monthlyPayment(principal, apr, 24), status: "active", requestedAt: "2026-03-01T15:00:00Z" as IsoDateTime, schedule };
}

export const loans: Loan[] = [activeLoan()];
