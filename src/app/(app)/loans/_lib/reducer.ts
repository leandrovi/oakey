import type { Cents, Installment, Loan, LoanId } from "@/lib/domain/types";

export type LoansAction =
  | { type: "request"; loan: Loan }
  | { type: "cancel"; id: LoanId }
  | { type: "payInstallment"; id: LoanId }
  | { type: "payOff"; id: LoanId };

/** The amount owed right now if paid off today: the balance before the next unpaid installment. */
export function payoffAmount(loan: Loan): Cents {
  const idx = loan.schedule.findIndex((i) => !i.paid);
  if (idx === -1) return 0 as Cents;
  return idx === 0 ? loan.principal : loan.schedule[idx - 1].remaining;
}

function payNextInstallment(schedule: Installment[]): Installment[] {
  const idx = schedule.findIndex((i) => !i.paid);
  if (idx === -1) return schedule;
  return schedule.map((i, n) => (n === idx ? { ...i, paid: true } : i));
}

function payOffAll(schedule: Installment[]): Installment[] {
  return schedule.map((i) => (i.paid ? i : { ...i, paid: true, remaining: 0 as Cents }));
}

function updateLoan(loan: Loan, action: LoansAction): Loan {
  switch (action.type) {
    case "cancel":
      return loan.status === "pending" ? { ...loan, status: "canceled" } : loan;
    case "payInstallment": {
      if (loan.status !== "active") return loan;
      const schedule = payNextInstallment(loan.schedule);
      const allPaid = schedule.every((i) => i.paid);
      return { ...loan, schedule, status: allPaid ? "paid_off" : loan.status };
    }
    case "payOff": {
      if (loan.status !== "active") return loan;
      return { ...loan, schedule: payOffAll(loan.schedule), status: "paid_off" };
    }
    default:
      return loan;
  }
}

export function loansReducer(state: Loan[], action: LoansAction): Loan[] {
  if (action.type === "request") return [action.loan, ...state];
  return state.map((loan) => (loan.id === action.id ? updateLoan(loan, action) : loan));
}
