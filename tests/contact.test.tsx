import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "../src/context/LanguageContext";
import Contact from "../src/pages/Contact";

// ── Supabase client mock ─────────────────────────────────────
// Contact's children (Navbar, auth modals) import the client; stub it so
// importing the module doesn't try to create a real Supabase connection.
vi.mock("../src/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn(),
  },
}));

// ── Auth context mock ────────────────────────────────────────
// Contact itself doesn't use auth, but Navbar / RegisterModal / LoginModal do.
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: null,
    session: null,
    profile: null,
    loading: false,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    changePassword: vi.fn(),
    resetPasswordRequest: vi.fn(),
    resetPassword: vi.fn(),
    refreshProfile: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

// Mutations go through fetch (not the supabase client), so stub fetch globally.
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function renderContact() {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <Contact />
      </LanguageProvider>
    </BrowserRouter>,
  );
}

// Fills the four visible fields with valid values (Danish placeholders — DA is default)
async function fillForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText("Dit fulde navn"), "Anna Test");
  await user.type(screen.getByPlaceholderText("din@email.dk"), "anna@example.com");
  await user.type(screen.getByPlaceholderText("Hvad handler det om?"), "Spørgsmål");
  await user.type(screen.getByPlaceholderText("Skriv din besked her..."), "Hej, jeg har et spørgsmål.");
}

describe("Contact form", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("POSTs to the send-contact-message function and shows success", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    renderContact();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Send besked" }));

    // The form hit the public edge function endpoint with the typed values
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    const [url, options] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("/functions/v1/send-contact-message");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      name: "Anna Test",
      email: "anna@example.com",
      subject: "Spørgsmål",
      message: "Hej, jeg har et spørgsmål.",
    });

    // Success feedback appears and fields are cleared
    expect(
      await screen.findByText(/Tak for din besked/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Dit fulde navn")).toHaveValue("");
  });

  it("shows an error message when the function rejects the submission", async () => {
    const user = userEvent.setup();
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "spam", code: "SPAM_DETECTED" }),
    });

    renderContact();
    await fillForm(user);
    await user.click(screen.getByRole("button", { name: "Send besked" }));

    expect(
      await screen.findByText(/markeret som spam/i),
    ).toBeInTheDocument();
  });

  it("validates required fields client-side without calling the network", async () => {
    const user = userEvent.setup();
    renderContact();

    // Submit with everything empty
    await user.click(screen.getByRole("button", { name: "Send besked" }));

    expect(await screen.findByText(/Udfyld venligst alle felter/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
