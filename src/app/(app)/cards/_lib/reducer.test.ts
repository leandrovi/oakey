import { describe, expect, it } from "vitest";
import type { Card, CardId, Cents, CreditCardAccount } from "@/lib/domain/types";
import { cardsReducer, type CardsState } from "./reducer";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card_test" as CardId,
    kind: "virtual",
    nickname: "Test card",
    cardholder: "Alex Rivera",
    last4: "0000",
    expMonth: 1,
    expYear: 2030,
    status: "active",
    controls: {
      onlinePurchases: true,
      internationalPurchases: false,
      monthlyLimit: 100_000 as Cents,
      perTransactionLimit: 20_000 as Cents,
    },
    spentThisMonth: 0 as Cents,
    ...overrides,
  };
}

function makeState(card: Card): CardsState {
  const creditCard: CreditCardAccount = {
    limit: 1_000_000 as Cents,
    balance: 400_000 as Cents,
    statementBalance: 300_000 as Cents,
    minimumDue: 6_000 as Cents,
    dueDate: "2026-11-22" as CreditCardAccount["dueDate"],
    apr: 1999 as CreditCardAccount["apr"],
  };
  return { cards: [card], creditCard };
}

describe("cardsReducer", () => {
  it("freezes an active card", () => {
    const state = makeState(makeCard({ status: "active" }));
    const next = cardsReducer(state, { type: "freeze", id: "card_test" as CardId });
    expect(next.cards[0].status).toBe("frozen");
  });

  it("unfreezes a frozen card", () => {
    const state = makeState(makeCard({ status: "frozen" }));
    const next = cardsReducer(state, { type: "unfreeze", id: "card_test" as CardId });
    expect(next.cards[0].status).toBe("active");
  });

  it("cancel is terminal: no further action changes a canceled card", () => {
    const state = makeState(makeCard({ status: "canceled", canceledReason: "no_longer_needed" }));
    const next = cardsReducer(state, { type: "unfreeze", id: "card_test" as CardId });
    expect(next.cards[0].status).toBe("canceled");
    const next2 = cardsReducer(next, { type: "reportLost", id: "card_test" as CardId });
    expect(next2.cards[0].status).toBe("canceled");
  });

  it("cannot unfreeze a canceled card", () => {
    const state = makeState(makeCard({ status: "canceled", canceledReason: "compromised" }));
    const next = cardsReducer(state, { type: "unfreeze", id: "card_test" as CardId });
    expect(next.cards[0].status).toBe("canceled");
  });

  it("reports a card lost", () => {
    const state = makeState(makeCard({ status: "active" }));
    const next = cardsReducer(state, { type: "reportLost", id: "card_test" as CardId });
    expect(next.cards[0].status).toBe("lost");
  });

  it("locks controls once a card is lost", () => {
    const state = makeState(makeCard({ status: "lost" }));
    const next = cardsReducer(state, { type: "toggleOnline", id: "card_test" as CardId });
    expect(next.cards[0].controls.onlinePurchases).toBe(true);
  });

  it("cancel wins over any prior status, including lost", () => {
    const state = makeState(makeCard({ status: "lost" }));
    const next = cardsReducer(state, { type: "cancel", id: "card_test" as CardId, reason: "lost" });
    expect(next.cards[0].status).toBe("canceled");
    expect(next.cards[0].canceledReason).toBe("lost");
  });

  it("issues a new card onto the front of the list", () => {
    const state = makeState(makeCard());
    const fresh = makeCard({ id: "card_fresh" as CardId, nickname: "New card" });
    const next = cardsReducer(state, { type: "issue", card: fresh });
    expect(next.cards[0].id).toBe("card_fresh");
    expect(next.cards).toHaveLength(2);
  });

  it("pays down the credit card balance, clamped at zero", () => {
    const state = makeState(makeCard());
    const next = cardsReducer(state, { type: "payCreditCard", amount: 5_000_000 as Cents });
    expect(next.creditCard.balance).toBe(0);
    expect(next.creditCard.statementBalance).toBe(0);
    expect(next.creditCard.minimumDue).toBe(0);
  });

  it("partial credit card payment reduces balance and recomputes minimum due", () => {
    const state = makeState(makeCard());
    const next = cardsReducer(state, { type: "payCreditCard", amount: 100_000 as Cents });
    expect(next.creditCard.balance).toBe(300_000);
    expect(next.creditCard.statementBalance).toBe(200_000);
    expect(next.creditCard.minimumDue).toBe(4_000);
  });
});
