import { describe, expect, it } from "vitest";
import { preapprovedTerms, scoreBand } from "./offers";
import type { Cents } from "./types";

describe("preapprovedTerms", () => {
  it("returns the top tier at score 780 and above", () => {
    const terms = preapprovedTerms(780, 1_000_000 as Cents);
    expect(terms).not.toBeNull();
    expect(terms!.apr).toBe(749);
    expect(terms!.maxTermMonths).toBe(60);
  });

  it("returns the second tier just below 780", () => {
    const terms = preapprovedTerms(779, 1_000_000 as Cents);
    expect(terms!.apr).toBe(999);
    expect(terms!.maxTermMonths).toBe(48);
  });

  it("returns the lowest tier at exactly score 600", () => {
    const terms = preapprovedTerms(600, 1_000_000 as Cents);
    expect(terms).not.toBeNull();
    expect(terms!.apr).toBe(1899);
  });

  it("returns null just below score 600", () => {
    expect(preapprovedTerms(599, 1_000_000 as Cents)).toBeNull();
  });

  it("returns null for zero monthly inflow", () => {
    expect(preapprovedTerms(780, 0 as Cents)).toBeNull();
  });

  it("returns null for negative monthly inflow", () => {
    expect(preapprovedTerms(780, -1_000 as Cents)).toBeNull();
  });

  it("rounds the amount down to the nearest $1,000", () => {
    // Tier for 600: multiple 2. Inflow of $100,599 * 2 = $201,198 -> floors to $201,000.
    const terms = preapprovedTerms(600, 10_059_900 as Cents);
    expect(terms!.maxAmount).toBe(20_100_000);
  });

  it("caps the amount at $500,000 even for very high inflow", () => {
    const terms = preapprovedTerms(780, 1_000_000_000 as Cents);
    expect(terms!.maxAmount).toBe(50_000_000);
  });

  it("returns null when the rounded-down amount is zero", () => {
    // Score 600 tier, multiple 2: inflow of 1 cent * 2 = 2 cents, floors to $0.
    expect(preapprovedTerms(600, 1 as Cents)).toBeNull();
  });
});

describe("scoreBand", () => {
  it("returns Excellent at 800 and above", () => {
    expect(scoreBand(800)).toBe("Excellent");
    expect(scoreBand(850)).toBe("Excellent");
  });

  it("returns Very good just below 800", () => {
    expect(scoreBand(799)).toBe("Very good");
  });

  it("returns Very good at the 740 boundary", () => {
    expect(scoreBand(740)).toBe("Very good");
  });

  it("returns Good just below 740", () => {
    expect(scoreBand(739)).toBe("Good");
  });

  it("returns Good at the 670 boundary", () => {
    expect(scoreBand(670)).toBe("Good");
  });

  it("returns Fair just below 670", () => {
    expect(scoreBand(669)).toBe("Fair");
  });

  it("returns Fair at the 580 boundary", () => {
    expect(scoreBand(580)).toBe("Fair");
  });

  it("returns Poor just below 580", () => {
    expect(scoreBand(579)).toBe("Poor");
  });
});
