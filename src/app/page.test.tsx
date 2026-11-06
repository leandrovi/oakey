import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.fn();

vi.mock("@clerk/nextjs/server", () => ({
  auth: () => auth(),
}));

vi.mock("@/components/shell/theme-toggle", () => ({
  ThemeToggle: () => null,
}));

import HomePage from "./page";

describe("HomePage", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    auth.mockReset();
  });

  it("sends a signed-in visitor to the overview", async () => {
    auth.mockResolvedValue({ userId: "user_1" });
    render(await HomePage());

    const links = screen.getAllByRole("link", { name: "Access account" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/overview");
    expect(screen.queryByRole("link", { name: "Sign in" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Sign up" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Open an account" })).toBeNull();
  });

  it("keeps sign in and open an account for a visitor without a session", async () => {
    auth.mockResolvedValue({ userId: null });
    render(await HomePage());

    expect(screen.getAllByRole("link", { name: "Sign in" }).map((link) => link.getAttribute("href"))).toEqual(["/sign-in", "/sign-in"]);
    expect(screen.getByRole("link", { name: "Open an account" })).toHaveAttribute("href", "/sign-up");
    expect(screen.queryByRole("link", { name: "Access account" })).toBeNull();
  });
});
