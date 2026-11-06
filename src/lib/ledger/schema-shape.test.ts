import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { accounts } from "@/server/schema";

describe("accounts table", () => {
  it("has no balance column", () => {
    expect(Object.keys(getTableColumns(accounts))).not.toContain("balance");
  });
});
