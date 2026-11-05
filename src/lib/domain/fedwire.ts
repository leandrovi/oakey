import type { Cents, IsoDate } from "./types";

export const WIRE_FEE = 1500 as Cents;
const CUTOFF_HOUR_ET = 18;

/** Federal Reserve holidays observed in 2026 and 2027. */
const FED_HOLIDAYS = new Set([
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-05-25", "2026-06-19", "2026-07-03", "2026-09-07",
  "2026-10-12", "2026-11-11", "2026-11-26", "2026-12-25",
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-05-31", "2027-06-18", "2027-07-05", "2027-09-06",
  "2027-10-11", "2027-11-11", "2027-11-25", "2027-12-24",
]);

function etParts(at: Date): { date: IsoDate; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get("year")}-${get("month")}-${get("day")}` as IsoDate, hour: Number(get("hour")) };
}

export function isBusinessDay(date: IsoDate): boolean {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day !== 0 && day !== 6 && !FED_HOLIDAYS.has(date);
}

function nextDay(date: IsoDate): IsoDate {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10) as IsoDate;
}

export function nextBusinessDay(date: IsoDate): IsoDate {
  let d = nextDay(date);
  while (!isBusinessDay(d)) d = nextDay(d);
  return d;
}

/** Settlement date for a wire submitted at `at`: same day before the 6pm ET cutoff on a business day, otherwise the next business day. */
export function wireSettlementDate(at: Date): { date: IsoDate; sameDay: boolean } {
  const { date, hour } = etParts(at);
  if (isBusinessDay(date) && hour < CUTOFF_HOUR_ET) return { date, sameDay: true };
  return { date: nextBusinessDay(date), sameDay: false };
}
