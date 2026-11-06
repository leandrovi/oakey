"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBank } from "@/components/bank/provider";
import type { Card, CardId } from "@/lib/domain/types";
import { issueCardAction, payCardAction, updateCardAction } from "@/server/actions";
import { cardsReducer, type CardsAction, type CardsState } from "./reducer";

interface CardsContextValue {
  state: CardsState;
  dispatch: (action: CardsAction) => void;
  getCard: (id: string) => Card | undefined;
}

const CardsContext = createContext<CardsContextValue | null>(null);

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const bank = useBank();
  const router = useRouter();
  const initial = useMemo<CardsState>(() => ({ cards: bank.cards, creditCard: bank.creditCard }), [bank]);
  const [state, rawDispatch] = useReducer(cardsReducer, initial);
  const serial = JSON.stringify(initial);
  useEffect(() => {
    rawDispatch({ type: "hydrate", state: JSON.parse(serial) as CardsState });
  }, [serial]);
  const busy = useRef(false);

  async function dispatch(action: CardsAction) {
    if (action.type === "hydrate") return;
    if (busy.current) return;
    busy.current = true;
    rawDispatch(action);
    const idempotencyKey = crypto.randomUUID();
    const checking = bank.accounts.find((account) => account.kind === "checking");
    const result = action.type === "issue"
      ? await issueCardAction({
          idempotencyKey,
          id: action.card.id,
          kind: action.card.kind,
          nickname: action.card.nickname,
          cardholder: action.card.cardholder,
          last4: action.card.last4,
          expMonth: action.card.expMonth,
          expYear: action.card.expYear,
          monthlyLimit: action.card.controls.monthlyLimit,
          perTransactionLimit: action.card.controls.perTransactionLimit,
        })
      : action.type === "payCreditCard"
        ? await payCardAction({ idempotencyKey, fromAccountId: checking?.id ?? "", amount: action.amount })
        : await updateCardAction(action);
    busy.current = false;
    if (!result.ok) toast.error(result.message);
    router.refresh();
  }

  const value = useMemo<CardsContextValue>(
    () => ({ state, dispatch, getCard: (id) => state.cards.find((card) => card.id === (id as CardId)) }),
    [state],
  );
  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCardsStore() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCardsStore must be used within CardsProvider");
  return ctx;
}
