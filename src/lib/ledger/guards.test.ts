import { describe, expect, it } from "vitest";
import { MOVEMENT_LIMIT, idempotencyDecision, rateLimitAllows } from "./guards";

describe("idempotency", () => {
  it("proceeds when the key is new", () => {
    expect(idempotencyDecision(null, "hash")).toBe("proceed");
  });

  it("replays when the key and the body match", () => {
    expect(idempotencyDecision({ requestHash: "hash" }, "hash")).toBe("replay");
  });

  it("conflicts when the key is reused for a different body", () => {
    expect(idempotencyDecision({ requestHash: "hash" }, "other")).toBe("conflict");
  });
});

describe("rate limit", () => {
  it("allows movements under the cap and blocks the next one", () => {
    expect(rateLimitAllows(0)).toBe(true);
    expect(rateLimitAllows(MOVEMENT_LIMIT - 1)).toBe(true);
    expect(rateLimitAllows(MOVEMENT_LIMIT)).toBe(false);
    expect(rateLimitAllows(3, 3)).toBe(false);
  });
});
