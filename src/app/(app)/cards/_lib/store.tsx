"use client";

import { createContext, useContext, useMemo, useReducer } from "react";
import { cards as seedCards, creditCard as seedCreditCard } from "@/lib/mock/seed";
import type { Card, CardId } from "@/lib/domain/types";
import { cardsReducer, type CardsAction, type CardsState } from "./reducer";

interface CardsContextValue {
  state: CardsState;
  dispatch: React.Dispatch<CardsAction>;
  getCard: (id: string) => Card | undefined;
}

const CardsContext = createContext<CardsContextValue | null>(null);

export function CardsProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cardsReducer, { cards: seedCards, creditCard: seedCreditCard });
  const value = useMemo<CardsContextValue>(
    () => ({ state, dispatch, getCard: (id) => state.cards.find((c) => c.id === (id as CardId)) }),
    [state],
  );
  return <CardsContext.Provider value={value}>{children}</CardsContext.Provider>;
}

export function useCardsStore() {
  const ctx = useContext(CardsContext);
  if (!ctx) throw new Error("useCardsStore must be used within CardsProvider");
  return ctx;
}
