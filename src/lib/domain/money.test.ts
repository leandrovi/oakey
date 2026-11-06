import { describe, expect, it } from "vitest";
import { addCents, bps, cents, formatBps, formatCents, parseDollars } from "./money";
import type { BasisPoints, Cents } from "./types";

describe("cents", () => {
  it("accepts safe integers", () => {
    expect(cents(0)).toBe(0);
    expect(cents(12345)).toBe(12345);
    expect(cents(-500)).toBe(-500);
  });

  it("rejects floats", () => {
    expect(() => cents(1.5)).toThrow(RangeError);
    expect(() => cents(0.1)).toThrow(RangeError);
  });

  it("rejects unsafe integers", () => {
    expect(() => cents(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
    expect(() => cents(2 ** 53)).toThrow(RangeError);
  });

  it("accepts the largest safe integer", () => {
    expect(cents(Number.MAX_SAFE_INTEGER)).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe("bps", () => {
  it("accepts non-negative integers", () => {
    expect(bps(0)).toBe(0);
    expect(bps(1999)).toBe(1999);
  });

  it("rejects negative values", () => {
    expect(() => bps(-1)).toThrow(RangeError);
  });

  it("rejects non-integers", () => {
    expect(() => bps(1.5)).toThrow(RangeError);
  });
});

describe("parseDollars", () => {
  it("accepts a comma-grouped amount", () => {
    expect(parseDollars("1,234.56")).toBe(123456);
  });

  it("accepts a dollar sign with no cents", () => {
    expect(parseDollars("$12")).toBe(1200);
  });

  it("accepts a half dollar as 50 cents", () => {
    expect(parseDollars("0.5")).toBe(50);
  });

  it("rejects three decimal digits", () => {
    expect(parseDollars("1.234")).toBeNull();
  });

  it("rejects negative amounts", () => {
    expect(parseDollars("-5")).toBeNull();
  });

  it("rejects non-numeric input", () => {
    expect(parseDollars("abc")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseDollars("")).toBeNull();
  });

  it("tolerates internal whitespace", () => {
    expect(parseDollars(" 1, 234 . 56 ")).toBe(123456);
  });

  it("rejects an amount whose cents overflow safe integer range", () => {
    expect(parseDollars("90071992547409.92")).toBeNull();
  });
});

describe("addCents", () => {
  it("sums several amounts", () => {
    expect(addCents(100 as Cents, 200 as Cents, 300 as Cents)).toBe(600);
  });

  it("returns 0 for no arguments", () => {
    expect(addCents()).toBe(0);
  });
});

describe("formatCents", () => {
  it("formats a plain amount with cents", () => {
    expect(formatCents(123456 as Cents)).toBe("$1,234.56");
  });

  it("formats a whole-dollar amount with no decimals", () => {
    expect(formatCents(150000 as Cents, { whole: true })).toBe("$1,500");
  });

  it("formats a large amount compactly", () => {
    expect(formatCents(150000000 as Cents, { compact: true })).toBe("$1.5M");
  });

  it("prefixes a positive signed amount with +", () => {
    expect(formatCents(50000 as Cents, { signed: true })).toBe("+$500.00");
  });

  it("does not prefix a signed amount of zero", () => {
    expect(formatCents(0 as Cents, { signed: true })).toBe("$0.00");
  });

  it("does not add a double sign for a negative signed amount", () => {
    expect(formatCents(-50000 as Cents, { signed: true })).toBe("-$500.00");
  });
});

describe("formatBps", () => {
  it("formats basis points as a percentage with two decimals", () => {
    expect(formatBps(749 as BasisPoints)).toBe("7.49%");
  });

  it("formats zero basis points", () => {
    expect(formatBps(0 as BasisPoints)).toBe("0.00%");
  });
});
