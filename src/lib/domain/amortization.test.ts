import { describe, expect, it } from "vitest";
import { amortizationSchedule, monthlyPayment, totalInterest } from "./amortization";
import type { BasisPoints, Cents, IsoDate } from "./types";

describe("monthlyPayment", () => {
  it("matches the standard amortization formula for $10,000 at 6% APR over 12 months", () => {
    const principal = 1_000_000 as Cents;
    const apr = 600 as BasisPoints;
    const term = 12;
    const r = 600 / 10_000 / 12;
    const expected = Math.ceil((principal * r) / (1 - Math.pow(1 + r, -term)));
    expect(expected).toBe(86067);
    expect(monthlyPayment(principal, apr, term)).toBe(86067);
  });

  it("splits a 0% APR loan evenly and ceils to the cent", () => {
    // 1,000,003 cents over 4 months: 250000.75 ceils to 250001.
    expect(monthlyPayment(1_000_003 as Cents, 0 as BasisPoints, 4)).toBe(250_001);
  });

  it("returns 0 for a non-positive principal", () => {
    expect(monthlyPayment(0 as Cents, 600 as BasisPoints, 12)).toBe(0);
    expect(monthlyPayment(-100 as Cents, 600 as BasisPoints, 12)).toBe(0);
  });

  it("rejects a term of 0", () => {
    expect(() => monthlyPayment(1_000_000 as Cents, 600 as BasisPoints, 0)).toThrow(RangeError);
  });

  it("rejects a non-integer term", () => {
    expect(() => monthlyPayment(1_000_000 as Cents, 600 as BasisPoints, 12.5)).toThrow(RangeError);
  });

  it("rejects a negative term", () => {
    expect(() => monthlyPayment(1_000_000 as Cents, 600 as BasisPoints, -1)).toThrow(RangeError);
  });
});

describe("amortizationSchedule", () => {
  const firstDue = "2026-01-31" as IsoDate;

  it("sums principal across installments to exactly the loan principal", () => {
    const principal = 1_000_000 as Cents;
    const schedule = amortizationSchedule(principal, 600 as BasisPoints, 12, firstDue);
    const principalSum = schedule.reduce((sum, i) => sum + i.principal, 0);
    expect(principalSum).toBe(principal);
  });

  it("leaves zero remaining after the last installment", () => {
    const schedule = amortizationSchedule(1_000_000 as Cents, 600 as BasisPoints, 12, firstDue);
    expect(schedule.at(-1)!.remaining).toBe(0);
  });

  it("sums interest across installments to totalInterest", () => {
    const schedule = amortizationSchedule(1_000_000 as Cents, 600 as BasisPoints, 12, firstDue);
    const interestSum = schedule.reduce((sum, i) => sum + i.interest, 0);
    expect(totalInterest(schedule)).toBe(interestSum);
  });

  it("advances due dates monthly, clamping end-of-month overflow (Jan 31 -> Feb 28)", () => {
    const schedule = amortizationSchedule(1_000_000 as Cents, 600 as BasisPoints, 3, firstDue);
    expect(schedule.map((i) => i.dueDate)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("numbers installments sequentially starting at 1", () => {
    const schedule = amortizationSchedule(1_000_000 as Cents, 600 as BasisPoints, 3, firstDue);
    expect(schedule.map((i) => i.number)).toEqual([1, 2, 3]);
  });

  it("marks every installment unpaid initially", () => {
    const schedule = amortizationSchedule(1_000_000 as Cents, 600 as BasisPoints, 3, firstDue);
    expect(schedule.every((i) => i.paid === false)).toBe(true);
  });

  it("holds principal sum exact even at 0% APR", () => {
    const principal = 1_000_003 as Cents;
    const schedule = amortizationSchedule(principal, 0 as BasisPoints, 4, firstDue);
    expect(schedule.reduce((sum, i) => sum + i.principal, 0)).toBe(principal);
    expect(schedule.every((i) => i.interest === 0)).toBe(true);
  });

  it("each installment's payment equals principal plus interest", () => {
    const schedule = amortizationSchedule(1_000_000 as Cents, 600 as BasisPoints, 12, firstDue);
    for (const row of schedule) {
      expect(row.payment).toBe(row.principal + row.interest);
    }
  });
});
