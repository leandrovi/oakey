import { describe, expect, it } from "vitest";
import { amortizationSchedule, monthlyPayment } from "@/lib/domain/amortization";
import type { BasisPoints, Cents, IsoDate, IsoDateTime, Loan, LoanId, LoanOfferId } from "@/lib/domain/types";
import { loansReducer, payoffAmount } from "./reducer";

function makeLoan(overrides: Partial<Loan> = {}): Loan {
  const principal = 120_000 as Cents;
  const apr = 1200 as BasisPoints;
  const termMonths = 6;
  const schedule = amortizationSchedule(principal, apr, termMonths, "2026-01-05" as IsoDate);
  return {
    id: "loan_test" as LoanId,
    offerId: "offer_test" as LoanOfferId,
    name: "Test loan",
    principal,
    apr,
    termMonths,
    monthlyPayment: monthlyPayment(principal, apr, termMonths),
    status: "active",
    requestedAt: "2025-12-01T00:00:00Z" as IsoDateTime,
    schedule,
    ...overrides,
  };
}

describe("loansReducer", () => {
  it("adds a requested loan to the front", () => {
    const loan = makeLoan({ status: "pending" });
    const next = loansReducer([], { type: "request", loan });
    expect(next).toHaveLength(1);
    expect(next[0].status).toBe("pending");
  });

  it("cancels a pending loan only", () => {
    const pending = makeLoan({ status: "pending" });
    const next = loansReducer([pending], { type: "cancel", id: pending.id });
    expect(next[0].status).toBe("canceled");

    const active = makeLoan({ status: "active" });
    const unchanged = loansReducer([active], { type: "cancel", id: active.id });
    expect(unchanged[0].status).toBe("active");
  });

  it("pays the next unpaid installment", () => {
    const loan = makeLoan();
    const next = loansReducer([loan], { type: "payInstallment", id: loan.id });
    expect(next[0].schedule[0].paid).toBe(true);
    expect(next[0].schedule[1].paid).toBe(false);
    expect(next[0].status).toBe("active");
  });

  it("marks the loan paid off once the last installment is paid", () => {
    const loan = makeLoan({ termMonths: 1, schedule: amortizationSchedule(120_000 as Cents, 1200 as BasisPoints, 1, "2026-01-05" as IsoDate) });
    const next = loansReducer([loan], { type: "payInstallment", id: loan.id });
    expect(next[0].status).toBe("paid_off");
    expect(next[0].schedule[0].paid).toBe(true);
  });

  it("pays off the whole loan early", () => {
    const loan = makeLoan();
    const next = loansReducer([loan], { type: "payOff", id: loan.id });
    expect(next[0].status).toBe("paid_off");
    expect(next[0].schedule.every((i) => i.paid)).toBe(true);
  });

  it("computes the payoff amount as the balance before the next unpaid installment", () => {
    const loan = makeLoan();
    expect(payoffAmount(loan)).toBe(loan.principal);
    const afterOne = loansReducer([loan], { type: "payInstallment", id: loan.id })[0];
    expect(payoffAmount(afterOne)).toBe(afterOne.schedule[0].remaining);
  });

  it("payoff amount is zero once fully paid", () => {
    const loan = makeLoan();
    const paidOff = loansReducer([loan], { type: "payOff", id: loan.id })[0];
    expect(payoffAmount(paidOff)).toBe(0);
  });
});
