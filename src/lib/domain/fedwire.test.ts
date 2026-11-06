import { describe, expect, it } from "vitest";
import { isBusinessDay, nextBusinessDay, wireSettlementDate, WIRE_FEE } from "./fedwire";
import type { IsoDate } from "./types";

describe("wireSettlementDate", () => {
  it("settles same day for a Tuesday 10:00 ET submission", () => {
    // 2026-11-03 is a Tuesday; ET is EST (UTC-5) in November.
    const result = wireSettlementDate(new Date("2026-11-03T15:00:00Z"));
    expect(result).toEqual({ date: "2026-11-03", sameDay: true });
  });

  it("rolls to the next business day at 18:00 ET", () => {
    const result = wireSettlementDate(new Date("2026-11-03T23:00:00Z"));
    expect(result).toEqual({ date: "2026-11-04", sameDay: false });
  });

  it("rolls to the next business day after 18:00 ET", () => {
    const result = wireSettlementDate(new Date("2026-11-03T23:30:00Z"));
    expect(result.sameDay).toBe(false);
    expect(result.date).toBe("2026-11-04");
  });

  it("rolls a Friday-after-cutoff submission to the following Monday", () => {
    // 2026-11-06 is a Friday.
    const result = wireSettlementDate(new Date("2026-11-06T23:00:00Z"));
    expect(result).toEqual({ date: "2026-11-09", sameDay: false });
  });

  it("rolls a Saturday submission to the following Monday", () => {
    // 2026-11-07 is a Saturday, 10:00 ET.
    const result = wireSettlementDate(new Date("2026-11-07T15:00:00Z"));
    expect(result).toEqual({ date: "2026-11-09", sameDay: false });
  });

  it("skips Thanksgiving: a Wednesday-after-cutoff submission settles the Friday after", () => {
    // 2026-11-25 is a Wednesday; 2026-11-26 (Thursday) is Thanksgiving.
    const result = wireSettlementDate(new Date("2026-11-25T23:00:00Z"));
    expect(result).toEqual({ date: "2026-11-27", sameDay: false });
  });

  it("stays same day just before the cutoff on the DST transition day", () => {
    // 2026-11-01 is the day DST ends (clocks fall back at 2am local); it's a Sunday though,
    // so use the Monday after: 2026-11-02, 10:00 ET under the new EST offset (UTC-5).
    const result = wireSettlementDate(new Date("2026-11-02T15:00:00Z"));
    expect(result).toEqual({ date: "2026-11-02", sameDay: true });
  });

  it("uses the EDT offset (UTC-4) before DST ends in the fall", () => {
    // 2026-10-27 is a Tuesday, still under EDT. 10:00 ET = 14:00 UTC.
    const result = wireSettlementDate(new Date("2026-10-27T14:00:00Z"));
    expect(result).toEqual({ date: "2026-10-27", sameDay: true });
  });

  it("uses the EST offset (UTC-5) after DST ends in the fall for the same wall-clock UTC hour", () => {
    // 2026-11-03 is a Tuesday, now under EST. The same 14:00 UTC instant is only 9:00 ET,
    // still before the 18:00 ET cutoff and still same-day.
    const result = wireSettlementDate(new Date("2026-11-03T14:00:00Z"));
    expect(result).toEqual({ date: "2026-11-03", sameDay: true });
  });

  it("uses the EST offset (UTC-5) before DST starts in the spring", () => {
    // 2026-03-05 is a Thursday, before DST starts (2026-03-08). 10:00 ET = 15:00 UTC.
    const result = wireSettlementDate(new Date("2026-03-05T15:00:00Z"));
    expect(result).toEqual({ date: "2026-03-05", sameDay: true });
  });

  it("uses the EDT offset (UTC-4) after DST starts in the spring", () => {
    // 2026-03-09 is a Monday, after DST starts. 10:00 ET = 14:00 UTC.
    const result = wireSettlementDate(new Date("2026-03-09T14:00:00Z"));
    expect(result).toEqual({ date: "2026-03-09", sameDay: true });
  });
});

describe("isBusinessDay", () => {
  it("treats a weekday as a business day", () => {
    expect(isBusinessDay("2026-11-03" as IsoDate)).toBe(true);
  });

  it("treats Saturday and Sunday as non-business days", () => {
    expect(isBusinessDay("2026-11-07" as IsoDate)).toBe(false);
    expect(isBusinessDay("2026-11-08" as IsoDate)).toBe(false);
  });

  it("treats a Fed holiday as a non-business day", () => {
    expect(isBusinessDay("2026-11-26" as IsoDate)).toBe(false);
  });
});

describe("nextBusinessDay", () => {
  it("returns the following day when it is a business day", () => {
    expect(nextBusinessDay("2026-11-03" as IsoDate)).toBe("2026-11-04");
  });

  it("skips a weekend", () => {
    expect(nextBusinessDay("2026-11-06" as IsoDate)).toBe("2026-11-09");
  });

  it("skips a holiday that falls on a weekday", () => {
    expect(nextBusinessDay("2026-11-25" as IsoDate)).toBe("2026-11-27");
  });
});

describe("WIRE_FEE", () => {
  it("is a fixed positive fee", () => {
    expect(WIRE_FEE).toBe(1500);
  });
});
