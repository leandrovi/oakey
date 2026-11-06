import { describe, expect, it } from "vitest";
import { AuthBoundaryError, assertOwner, onlyOwned, requireUserId } from "./boundary";

describe("auth boundary", () => {
  it("accepts a signed-in user id", () => {
    expect(requireUserId("user_1")).toBe("user_1");
  });

  it("rejects a missing session", () => {
    expect(() => requireUserId(null)).toThrow(AuthBoundaryError);
    expect(() => requireUserId(undefined)).toThrow(AuthBoundaryError);
    expect(() => requireUserId("")).toThrow(AuthBoundaryError);
  });

  it("allows the owner and rejects everyone else", () => {
    expect(() => assertOwner("user_1", "user_1")).not.toThrow();
    expect(() => assertOwner("user_1", "user_2")).toThrow(AuthBoundaryError);
    expect(() => assertOwner("", "user_1")).toThrow(AuthBoundaryError);
  });

  it("returns only the actor's rows", () => {
    const rows = [
      { userId: "user_1", id: "a" },
      { userId: "user_2", id: "b" },
      { userId: "user_1", id: "c" },
    ];
    expect(onlyOwned(rows, "user_1").map((row) => row.id)).toEqual(["a", "c"]);
    expect(onlyOwned(rows, "user_3")).toEqual([]);
    expect(() => onlyOwned(rows, "")).toThrow(AuthBoundaryError);
  });
});
