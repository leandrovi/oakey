import type { Card, CardCancelReason, CardId, Cents, CreditCardAccount } from "@/lib/domain/types";

export interface CardsState {
  cards: Card[];
  creditCard: CreditCardAccount;
}

export type CardsAction =
  | { type: "freeze"; id: CardId }
  | { type: "unfreeze"; id: CardId }
  | { type: "toggleOnline"; id: CardId }
  | { type: "toggleInternational"; id: CardId }
  | { type: "setMonthlyLimit"; id: CardId; limit: Cents }
  | { type: "setPerTransactionLimit"; id: CardId; limit: Cents }
  | { type: "reportLost"; id: CardId }
  | { type: "cancel"; id: CardId; reason: CardCancelReason }
  | { type: "issue"; card: Card }
  | { type: "payCreditCard"; amount: Cents }
  | { type: "hydrate"; state: CardsState };

/** Canceled cards never change again; the UI confirms this is irreversible. */
function isTerminal(card: Card): boolean {
  return card.status === "canceled";
}

/** Controls, limits and freeze state only move while the card can still be used. */
function isControllable(card: Card): boolean {
  return card.status === "active" || card.status === "frozen";
}

function updateCard(card: Card, action: CardsAction): Card {
  if (isTerminal(card)) return card;
  switch (action.type) {
    case "freeze":
      return card.status === "active" ? { ...card, status: "frozen" } : card;
    case "unfreeze":
      return card.status === "frozen" ? { ...card, status: "active" } : card;
    case "toggleOnline":
      return isControllable(card)
        ? { ...card, controls: { ...card.controls, onlinePurchases: !card.controls.onlinePurchases } }
        : card;
    case "toggleInternational":
      return isControllable(card)
        ? { ...card, controls: { ...card.controls, internationalPurchases: !card.controls.internationalPurchases } }
        : card;
    case "setMonthlyLimit":
      return isControllable(card) ? { ...card, controls: { ...card.controls, monthlyLimit: action.limit } } : card;
    case "setPerTransactionLimit":
      return isControllable(card)
        ? { ...card, controls: { ...card.controls, perTransactionLimit: action.limit } }
        : card;
    case "reportLost":
      return { ...card, status: "lost" };
    case "cancel":
      return { ...card, status: "canceled", canceledReason: action.reason };
    default:
      return card;
  }
}

export function cardsReducer(state: CardsState, action: CardsAction): CardsState {
  if (action.type === "hydrate") return action.state;
  switch (action.type) {
    case "issue":
      return { ...state, cards: [action.card, ...state.cards] };
    case "payCreditCard": {
      const payment = Math.min(action.amount, state.creditCard.balance) as Cents;
      const balance = (state.creditCard.balance - payment) as Cents;
      const statementBalance = Math.max(0, state.creditCard.statementBalance - payment) as Cents;
      const minimumDue = (statementBalance > 0 ? Math.max(2_500, Math.round(statementBalance * 0.02)) : 0) as Cents;
      return { ...state, creditCard: { ...state.creditCard, balance, statementBalance, minimumDue } };
    }
    default:
      return {
        ...state,
        cards: state.cards.map((card) => (card.id === action.id ? updateCard(card, action) : card)),
      };
  }
}
