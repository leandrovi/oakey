import type { BasisPoints, Cents } from "./types";

export interface OfferTerms {
  maxAmount: Cents;
  apr: BasisPoints;
  maxTermMonths: number;
}

/** Score tiers set the base APR and term; average monthly net inflow caps the amount at six months of cash flow. */
const TIERS = [
  { minScore: 780, apr: 749, maxTermMonths: 60, multiple: 6 },
  { minScore: 720, apr: 999, maxTermMonths: 48, multiple: 5 },
  { minScore: 660, apr: 1399, maxTermMonths: 36, multiple: 3 },
  { minScore: 600, apr: 1899, maxTermMonths: 24, multiple: 2 },
] as const;

export function preapprovedTerms(score: number, avgMonthlyNetInflow: Cents): OfferTerms | null {
  const tier = TIERS.find((t) => score >= t.minScore);
  if (!tier || avgMonthlyNetInflow <= 0) return null;
  const raw = avgMonthlyNetInflow * tier.multiple;
  const maxAmount = Math.min(Math.floor(raw / 100_000) * 100_000, 50_000_000) as Cents;
  if (maxAmount <= 0) return null;
  return { maxAmount, apr: tier.apr as BasisPoints, maxTermMonths: tier.maxTermMonths };
}

export function scoreBand(score: number): "Excellent" | "Very good" | "Good" | "Fair" | "Poor" {
  if (score >= 800) return "Excellent";
  if (score >= 740) return "Very good";
  if (score >= 670) return "Good";
  if (score >= 580) return "Fair";
  return "Poor";
}
