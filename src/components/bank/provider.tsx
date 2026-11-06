"use client";

import { createContext, useContext } from "react";
import type { BankSnapshot } from "@/lib/ledger/project";

const BankContext = createContext<BankSnapshot | null>(null);

export function BankProvider({ book, children }: { book: BankSnapshot; children: React.ReactNode }) {
  return <BankContext.Provider value={book}>{children}</BankContext.Provider>;
}

export function useBank(): BankSnapshot {
  const book = useContext(BankContext);
  if (!book) throw new Error("useBank must be used within BankProvider");
  return book;
}
