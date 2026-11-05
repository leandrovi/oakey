declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

/** Integer number of US cents. Never a float. */
export type Cents = Brand<number, "Cents">;
/** APR or APY in basis points: 1% = 100. */
export type BasisPoints = Brand<number, "BasisPoints">;
/** A 9-digit ABA routing number whose checksum passed. */
export type RoutingNumber = Brand<string, "RoutingNumber">;
/** ISO-8601 timestamp string. */
export type IsoDateTime = Brand<string, "IsoDateTime">;
/** Calendar date, YYYY-MM-DD. */
export type IsoDate = Brand<string, "IsoDate">;

export type UserId = Brand<string, "UserId">;
export type AccountId = Brand<string, "AccountId">;
export type TransactionId = Brand<string, "TransactionId">;
export type RecipientId = Brand<string, "RecipientId">;
export type WireId = Brand<string, "WireId">;
export type CardId = Brand<string, "CardId">;
export type LoanId = Brand<string, "LoanId">;
export type LoanOfferId = Brand<string, "LoanOfferId">;

export interface User {
  id: UserId;
  firstName: string;
  lastName: string;
  email: string;
  businessName: string;
  createdAt: IsoDateTime;
}

export type DepositAccountKind = "checking" | "savings";

export interface DepositAccount {
  id: AccountId;
  kind: DepositAccountKind;
  name: string;
  /** Last four digits shown in the UI. */
  mask: string;
  routingNumber: RoutingNumber;
  /** Derived from ledger entries; never stored independently. */
  balance: Cents;
  apy: BasisPoints | null;
}

export type TransactionStatus = "pending" | "posted" | "failed";
export type TransactionDirection = "credit" | "debit";
export type TransactionType = "card" | "wire" | "ach" | "internal" | "fee" | "interest" | "loan";

export const TRANSACTION_CATEGORIES = [
  "Revenue",
  "Payroll",
  "Software",
  "Marketing",
  "Travel",
  "Meals",
  "Office",
  "Rent",
  "Taxes",
  "Transfers",
  "Interest",
  "Fees",
  "Loan",
] as const;
export type TransactionCategory = (typeof TRANSACTION_CATEGORIES)[number];

export interface Transaction {
  id: TransactionId;
  accountId: AccountId | CardId;
  postedAt: IsoDateTime;
  description: string;
  counterparty: string;
  category: TransactionCategory;
  type: TransactionType;
  direction: TransactionDirection;
  /** Always positive; `direction` carries the sign. */
  amount: Cents;
  status: TransactionStatus;
  /** Running balance of the account right after this entry, when posted. */
  balanceAfter: Cents | null;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface Recipient {
  id: RecipientId;
  name: string;
  address: Address;
  bankName: string;
  routingNumber: RoutingNumber;
  accountNumber: string;
  lastPaidAt: IsoDateTime | null;
}

export type WireStatus = "pending" | "processing" | "completed" | "canceled" | "failed";

export interface Wire {
  id: WireId;
  idempotencyKey: string;
  fromAccountId: AccountId;
  recipientId: RecipientId;
  amount: Cents;
  fee: Cents;
  memo: string;
  purpose: string;
  status: WireStatus;
  createdAt: IsoDateTime;
  /** Same day when submitted before the Fedwire cutoff, otherwise next business day. */
  expectedSettlementDate: IsoDate;
}

export type CardKind = "virtual" | "physical";
export type CardStatus = "active" | "frozen" | "lost" | "canceled";
export type CardCancelReason = "no_longer_needed" | "compromised" | "lost" | "employee_left" | "other";

export interface CardControls {
  onlinePurchases: boolean;
  internationalPurchases: boolean;
  monthlyLimit: Cents;
  perTransactionLimit: Cents;
}

export interface Card {
  id: CardId;
  kind: CardKind;
  nickname: string;
  cardholder: string;
  last4: string;
  expMonth: number;
  expYear: number;
  status: CardStatus;
  controls: CardControls;
  spentThisMonth: Cents;
  canceledReason?: CardCancelReason;
}

export interface CreditCardAccount {
  limit: Cents;
  balance: Cents;
  statementBalance: Cents;
  minimumDue: Cents;
  dueDate: IsoDate;
  apr: BasisPoints;
}

export type LoanStatus = "pending" | "active" | "paid_off" | "canceled";

export interface LoanOffer {
  id: LoanOfferId;
  name: string;
  maxAmount: Cents;
  minTermMonths: number;
  maxTermMonths: number;
  apr: BasisPoints;
  expiresAt: IsoDate;
}

export interface Installment {
  number: number;
  dueDate: IsoDate;
  payment: Cents;
  principal: Cents;
  interest: Cents;
  remaining: Cents;
  paid: boolean;
}

export interface Loan {
  id: LoanId;
  offerId: LoanOfferId;
  name: string;
  principal: Cents;
  apr: BasisPoints;
  termMonths: number;
  monthlyPayment: Cents;
  status: LoanStatus;
  requestedAt: IsoDateTime;
  schedule: Installment[];
}

export interface CreditFactor {
  name: string;
  impact: "high" | "medium" | "low";
  rating: "excellent" | "good" | "fair" | "poor";
  detail: string;
}

export interface CreditScore {
  score: number;
  updatedAt: IsoDate;
  factors: CreditFactor[];
  history: { month: IsoDate; score: number }[];
}
