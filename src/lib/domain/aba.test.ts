import { describe, expect, it } from "vitest";
import { isValidRoutingNumber, parseRoutingNumber } from "./aba";

const VALID = ["021000021", "026009593", "121000248", "011000015"];

describe("isValidRoutingNumber", () => {
  it.each(VALID)("accepts the known-valid routing number %s", (r) => {
    expect(isValidRoutingNumber(r)).toBe(true);
  });

  it.each(VALID)("rejects %s with its first digit changed", (r) => {
    const mutated = `${(Number(r[0]) + 1) % 10}${r.slice(1)}`;
    expect(isValidRoutingNumber(mutated)).toBe(false);
  });

  it.each(VALID)("rejects %s with its last digit changed", (r) => {
    const mutated = `${r.slice(0, -1)}${(Number(r[8]) + 1) % 10}`;
    expect(isValidRoutingNumber(mutated)).toBe(false);
  });

  it("rejects a string shorter than 9 digits", () => {
    expect(isValidRoutingNumber("02100002")).toBe(false);
  });

  it("rejects a string longer than 9 digits", () => {
    expect(isValidRoutingNumber("0210000210")).toBe(false);
  });

  it("rejects non-numeric characters", () => {
    expect(isValidRoutingNumber("02100002X")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidRoutingNumber("")).toBe(false);
  });
});

describe("parseRoutingNumber", () => {
  it("strips internal spaces before validating", () => {
    expect(parseRoutingNumber("021 000 021")).toBe("021000021");
  });

  it("strips leading and trailing spaces", () => {
    expect(parseRoutingNumber("  021000021  ")).toBe("021000021");
  });

  it("returns null for an invalid checksum", () => {
    expect(parseRoutingNumber("021000020")).toBeNull();
  });

  it("returns null for non-digit input", () => {
    expect(parseRoutingNumber("abcdefghi")).toBeNull();
  });
});
