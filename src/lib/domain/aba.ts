import type { RoutingNumber } from "./types";

const WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1];

export function isValidRoutingNumber(input: string): input is RoutingNumber {
  if (!/^\d{9}$/.test(input)) return false;
  const sum = WEIGHTS.reduce((acc, w, i) => acc + w * Number(input[i]), 0);
  return sum % 10 === 0;
}

export function parseRoutingNumber(input: string): RoutingNumber | null {
  const digits = input.replace(/\s/g, "");
  return isValidRoutingNumber(digits) ? digits : null;
}
