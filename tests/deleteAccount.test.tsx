import type { ReactNode } from "react";
import { useState } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../src/context/AuthContext";

// ── Supabase mock ────────────────────────────────────────────
// A logged-in session so AuthProvider sets a user on mount, and deleteAccount
// can read a fresh access token.
const SESSION = {
  user: { id: "user-1", email: "test@test.com" },
  access_token: "tok-123",
};

const mockGetSession = vi
  .fn()
  .mockResolvedValue({ data: { session: SESSION } });
const mockSignOut = vi.fn().mockResolvedValue(undefined);
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

vi.mock("../src/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
      signOut: () => mockSignOut(),
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    // Profile/purchase fetches on mount resolve to empty — irrelevant to this test
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  },
}));

// Edge-function call goes through fetch, not the supabase client
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ── Harness that exercises the real AuthContext.deleteAccount ─
function DeleteHarness() {
  const { deleteAccount } = useAuth();
  const [out, setOut] = useState("");
  return (
    <>
      <button
        onClick={async () => {
          const { error } = await deleteAccount("mypassword");
          setOut(error ?? "SUCCESS");
        }}
      >
        delete
      </button>
      <div data-testid="out">{out}</div>
    </>
  );
}

async function renderHarness(ui: ReactNode) {
  await act(async () => {
    render(<AuthProvider>{ui}</AuthProvider>);
  });
}

describe("AuthContext.deleteAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("posts the password to delete-account and signs out on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });
    const user = userEvent.setup();

    await renderHarness(<DeleteHarness />);
    await user.click(screen.getByRole("button", { name: "delete" }));

    await waitFor(() => {
      expect(screen.getByTestId("out")).toHaveTextContent("SUCCESS");
    });

    // Called the edge function with the password in the body
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/functions/v1/delete-account"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ password: "mypassword" }),
      }),
    );
    // Local session torn down after deletion
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("returns the error code and does not sign out on wrong password", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Password is incorrect", code: "INVALID_PASSWORD" }),
    });
    const user = userEvent.setup();

    await renderHarness(<DeleteHarness />);
    await user.click(screen.getByRole("button", { name: "delete" }));

    await waitFor(() => {
      expect(screen.getByTestId("out")).toHaveTextContent("INVALID_PASSWORD");
    });

    // Session must NOT be torn down when deletion fails
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
