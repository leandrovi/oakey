import type { BasisPoints, Cents, Installment, IsoDate } from "./types";

/** Fixed monthly payment for a fully amortizing loan, rounded up to the cent so the schedule never under-collects. */
export function monthlyPayment(principal: Cents, apr: BasisPoints, termMonths: number): Cents {
  if (termMonths <= 0 || !Number.isInteger(termMonths)) throw new RangeError("term must be a positive integer");
  if (principal <= 0) return 0 as Cents;
  const r = apr / 10_000 / 12;
  if (r === 0) return Math.ceil(principal / termMonths) as Cents;
  const payment = (principal * r) / (1 - Math.pow(1 + r, -termMonths));
  return Math.ceil(payment) as Cents;
}

function addMonths(start: IsoDate, months: number): IsoDate {
  const [y, m, d] = start.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(d, lastDay));
  return date.toISOString().slice(0, 10) as IsoDate;
}

/** Monthly schedule; the last installment absorbs rounding so principal sums exactly. */
export function amortizationSchedule(principal: Cents, apr: BasisPoints, termMonths: number, firstDueDate: IsoDate): Installment[] {
  const payment = monthlyPayment(principal, apr, termMonths);
  const r = apr / 10_000 / 12;
  let remaining: number = principal;
  const rows: Installment[] = [];
  for (let n = 1; n <= termMonths; n++) {
    const interest = Math.round(remaining * r);
    const isLast = n === termMonths;
    const principalPart = isLast ? remaining : Math.min(payment - interest, remaining);
    remaining -= principalPart;
    rows.push({
      number: n,
      dueDate: addMonths(firstDueDate, n - 1),
      payment: (principalPart + interest) as Cents,
      principal: principalPart as Cents,
      interest: interest as Cents,
      remaining: remaining as Cents,
      paid: false,
    });
  }
  return rows;
}

export function totalInterest(schedule: Installment[]): Cents {
  return schedule.reduce((sum, i) => sum + i.interest, 0) as Cents;
}
