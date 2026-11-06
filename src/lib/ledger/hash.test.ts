import { describe, expect, it } from "vitest";
import { requestHash } from "@/lib/ledger/hash";

describe("requestHash", () => {
  it("ignores key order and changes when a value changes", () => {
    expect(requestHash({ amount: 100, memo: "retainer" })).toBe(requestHash({ memo: "retainer", amount: 100 }));
    expect(requestHash({ amount: 100 })).not.toBe(requestHash({ amount: 200 }));
  });
});
