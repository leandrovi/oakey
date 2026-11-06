import { describe, expect, it } from "vitest";
import { canCancelWire, canTransition, isTerminal } from "./wire";
import type { WireStatus } from "./types";

const ALL_STATUSES: WireStatus[] = ["pending", "processing", "completed", "canceled", "failed"];

describe("canTransition", () => {
  it("allows pending to processing", () => {
    expect(canTransition("pending", "processing")).toBe(true);
  });

  it("allows pending to canceled", () => {
    expect(canTransition("pending", "canceled")).toBe(true);
  });

  it("allows pending to failed", () => {
    expect(canTransition("pending", "failed")).toBe(true);
  });

  it("allows processing to completed", () => {
    expect(canTransition("processing", "completed")).toBe(true);
  });

  it("allows processing to failed", () => {
    expect(canTransition("processing", "failed")).toBe(true);
  });

  it("does not allow processing to canceled", () => {
    expect(canTransition("processing", "canceled")).toBe(false);
  });

  it("does not allow processing back to pending", () => {
    expect(canTransition("processing", "pending")).toBe(false);
  });

  it.each(["completed", "canceled", "failed"] as const)("has no exits from the terminal state %s", (from) => {
    for (const to of ALL_STATUSES) {
      expect(canTransition(from, to)).toBe(false);
    }
  });
});

describe("isTerminal", () => {
  it.each(["completed", "canceled", "failed"] as const)("treats %s as terminal", (status) => {
    expect(isTerminal(status)).toBe(true);
  });

  it.each(["pending", "processing"] as const)("treats %s as non-terminal", (status) => {
    expect(isTerminal(status)).toBe(false);
  });
});

describe("canCancelWire", () => {
  it("allows cancellation only from pending", () => {
    expect(canCancelWire("pending")).toBe(true);
  });

  it.each(["processing", "completed", "canceled", "failed"] as const)("disallows cancellation from %s", (status) => {
    expect(canCancelWire(status)).toBe(false);
  });
});
