import type { WireStatus } from "./types";

const TRANSITIONS: Record<WireStatus, readonly WireStatus[]> = {
  pending: ["processing", "canceled", "failed"],
  processing: ["completed", "failed"],
  completed: [],
  canceled: [],
  failed: [],
};

export function canTransition(from: WireStatus, to: WireStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function canCancelWire(status: WireStatus): boolean {
  return canTransition(status, "canceled");
}

export function isTerminal(status: WireStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
