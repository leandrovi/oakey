"use client";

import { createContext, useContext, useReducer } from "react";
import { loans as seedLoans } from "@/lib/mock/seed";
import type { Loan } from "@/lib/domain/types";
import { loansReducer, type LoansAction } from "./reducer";

interface LoansContextValue {
  loans: Loan[];
  dispatch: React.Dispatch<LoansAction>;
}

const LoansContext = createContext<LoansContextValue | null>(null);

export function LoansProvider({ children }: { children: React.ReactNode }) {
  const [loans, dispatch] = useReducer(loansReducer, seedLoans);
  return <LoansContext.Provider value={{ loans, dispatch }}>{children}</LoansContext.Provider>;
}

export function useLoansStore() {
  const ctx = useContext(LoansContext);
  if (!ctx) throw new Error("useLoansStore must be used within LoansProvider");
  return ctx;
}
