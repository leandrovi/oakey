"use client";

import { createContext, useContext, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useBank } from "@/components/bank/provider";
import type { Loan } from "@/lib/domain/types";
import { cancelLoanAction, payInstallmentAction, payOffLoanAction, requestLoanAction } from "@/server/actions";
import { loansReducer, type LoansAction } from "./reducer";

interface LoansContextValue {
  loans: Loan[];
  dispatch: (action: LoansAction) => void;
}

const LoansContext = createContext<LoansContextValue | null>(null);

export function LoansProvider({ children }: { children: React.ReactNode }) {
  const bank = useBank();
  const router = useRouter();
  const [loans, rawDispatch] = useReducer(loansReducer, bank.loans);
  const serial = JSON.stringify(bank.loans);
  useEffect(() => {
    rawDispatch({ type: "hydrate", loans: JSON.parse(serial) as Loan[] });
  }, [serial]);
  const busy = useRef(false);

  async function dispatch(action: LoansAction) {
    if (action.type === "hydrate") return;
    if (busy.current) return;
    busy.current = true;
    rawDispatch(action);
    const idempotencyKey = crypto.randomUUID();
    const result = action.type === "request"
      ? await requestLoanAction({
          idempotencyKey,
          id: action.loan.id,
          offerId: action.loan.offerId,
          amount: action.loan.principal,
          termMonths: action.loan.termMonths,
        })
      : action.type === "cancel"
        ? await cancelLoanAction({ idempotencyKey, loanId: action.id })
        : action.type === "payInstallment"
          ? await payInstallmentAction({ idempotencyKey, loanId: action.id })
          : await payOffLoanAction({ idempotencyKey, loanId: action.id });
    busy.current = false;
    if (!result.ok) toast.error(result.message);
    router.refresh();
  }

  return <LoansContext.Provider value={{ loans, dispatch }}>{children}</LoansContext.Provider>;
}

export function useLoansStore() {
  const ctx = useContext(LoansContext);
  if (!ctx) throw new Error("useLoansStore must be used within LoansProvider");
  return ctx;
}
