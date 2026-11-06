import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();
const useAuth = vi.fn();

vi.mock("@clerk/nextjs", () => ({
  useAuth: () => useAuth(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

import { SignInSessionGate } from "./session-gate";

describe("SignInSessionGate", () => {
  beforeEach(() => {
    replace.mockReset();
    useAuth.mockReset();
  });

  it("hides the form and leaves for the overview when Clerk already has a session", async () => {
    useAuth.mockReturnValue({ isLoaded: true, userId: "user_1" });
    render(
      <SignInSessionGate>
        <p>Sign in to Oakey</p>
      </SignInSessionGate>,
    );

    expect(screen.queryByText("Sign in to Oakey")).toBeNull();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/overview"));
  });

  it("shows the form only after Clerk confirms there is no session", () => {
    useAuth.mockReturnValue({ isLoaded: false, userId: null });
    const { rerender } = render(
      <SignInSessionGate>
        <p>Sign in to Oakey</p>
      </SignInSessionGate>,
    );
    expect(screen.queryByText("Sign in to Oakey")).toBeNull();
    expect(replace).not.toHaveBeenCalled();

    useAuth.mockReturnValue({ isLoaded: true, userId: null });
    rerender(
      <SignInSessionGate>
        <p>Sign in to Oakey</p>
      </SignInSessionGate>,
    );
    expect(screen.getByText("Sign in to Oakey")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
