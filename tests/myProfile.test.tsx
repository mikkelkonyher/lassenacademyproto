/**
 * MyProfile page tests.
 *
 * Written as a regression harness before the page was split into hooks and
 * section components, so it deliberately asserts on what the user sees rather
 * than on internal structure: any of these failing after a refactor means
 * behaviour changed, not that the test needs updating.
 *
 * Covers: the logged-out login prompt, the loading spinner, the profile header,
 * the purchases and watchlist sections (loading / empty / populated), saving
 * account settings, password-change validation, and the delete-account modal.
 *
 * Approach mirrors purchase.test.tsx — mock useAuth and the surrounding
 * contexts, and mock the Supabase client at module level so the page's three
 * data fetches resolve from fixtures.
 */

import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "../src/context/LanguageContext";
import MyProfile from "../src/pages/MyProfile";

// ── Fixtures ─────────────────────────────────────────────────

const MOCK_USER = { id: "user-1", email: "test@test.com" };

const MOCK_PROFILE = {
  id: "user-1",
  full_name: "Test Bruger",
  bio: "Min bio",
  image_url: null,
  created_at: "2026-01-15T10:00:00Z",
  notify_email: true,
  notify_course_updates: true,
  notify_newsletter: false,
};

const MOCK_COURSE = {
  id: "course-1",
  slug: "guitar-basics",
  title_da: "Guitar Grundkursus",
  title_en: "Guitar Basics",
  image_url: "https://example.test/cover.jpg",
  instructor: "Lærer Lassen",
};

const MOCK_PURCHASE = {
  id: "purchase-1",
  purchased_at: "2026-07-27T12:00:00Z",
  price_paid_dkk: 499,
  courses: MOCK_COURSE,
};

const MOCK_WATCHLIST_ROW = {
  id: "watch-1",
  created_at: "2026-07-01T12:00:00Z",
  courses: MOCK_COURSE,
};

// ── Auth mock ────────────────────────────────────────────────

type MockUser = { id: string; email: string } | null;
const mockUserRef: { current: MockUser } = { current: null };
const mockProfileRef: { current: typeof MOCK_PROFILE | null } = { current: null };
const mockLoadingRef = { current: false };

const updateProfileSpy = vi.fn(async () => ({ error: null }));
const uploadAvatarSpy = vi.fn(async () => ({ error: null }));
const changePasswordSpy = vi.fn(async () => ({ error: null }));
const deleteAccountSpy = vi.fn(async () => ({ error: null }));

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUserRef.current,
    profile: mockProfileRef.current,
    loading: mockLoadingRef.current,
    isAdmin: false,
    purchasedCourseIds: new Set<string>(),
    updateProfile: updateProfileSpy,
    uploadAvatar: uploadAvatarSpy,
    changePassword: changePasswordSpy,
    deleteAccount: deleteAccountSpy,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
    refreshPurchases: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

// Watchlist context — the page filters its fetched rows against this Set so an
// optimistic un-save removes the card immediately.
const mockWatchlistCourses: { current: Set<string> } = { current: new Set() };
vi.mock("../src/context/WatchlistContext", () => ({
  WatchlistProvider: ({ children }: { children: ReactNode }) => children,
  useWatchlist: () => ({
    courses: mockWatchlistCourses.current,
    lessons: new Set<string>(),
    loading: false,
    isSaved: () => false,
    toggle: vi.fn(),
    toggleCourse: vi.fn(),
    toggleLesson: vi.fn(),
  }),
}));

// Watch-progress context — drives the "Continue watching" card
const mockProgressEntries: { current: unknown[] } = { current: [] };
vi.mock("../src/context/WatchProgressContext", () => ({
  WatchProgressProvider: ({ children }: { children: ReactNode }) => children,
  useWatchProgress: () => ({
    loading: false,
    progressEntries: mockProgressEntries.current,
    getProgress: () => undefined,
    saveProgress: vi.fn(),
  }),
}));

// ── Supabase mock ────────────────────────────────────────────
// The page issues three reads:
//   user_watchlist        .select().eq().order()      → thenable
//   user_course_purchases .select().order()           → thenable
//   lessons               .select().eq().maybeSingle() → thenable
// so `order` and `maybeSingle` both have to resolve like promises.

const tableData: Record<string, unknown[]> = {
  user_watchlist: [],
  user_course_purchases: [],
  lessons: [],
};

function thenable(getRows: () => unknown[]) {
  return {
    then: (resolve: (value: { data: unknown; error: null }) => unknown) =>
      Promise.resolve({ data: getRows(), error: null }).then(resolve),
  };
}

vi.mock("../src/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const rows = () => tableData[table] ?? [];
      const single = () => ({
        ...thenable(() => (rows()[0] ?? null) as unknown[]),
      });
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        order: () => ({ ...chain, ...thenable(rows) }),
        maybeSingle: single,
        ...thenable(rows),
      };
      return chain;
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────

function renderPage() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <MyProfile />
      </LanguageProvider>
    </MemoryRouter>
  );
}

/** Sign in with the default profile and a populated watchlist Set. */
function signIn() {
  mockUserRef.current = MOCK_USER;
  mockProfileRef.current = MOCK_PROFILE;
  mockWatchlistCourses.current = new Set([MOCK_COURSE.id]);
}

// ── Tests ────────────────────────────────────────────────────

describe("MyProfile Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRef.current = null;
    mockProfileRef.current = null;
    mockLoadingRef.current = false;
    mockWatchlistCourses.current = new Set();
    mockProgressEntries.current = [];
    tableData.user_watchlist = [];
    tableData.user_course_purchases = [];
    tableData.lessons = [];
  });

  describe("Access states", () => {
    it("shows the login prompt when logged out", async () => {
      renderPage();

      // "Log ind" also appears in the navbar, so match the prompt's heading
      expect(
        await screen.findByRole("heading", { level: 2, name: "Log ind" })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Velkommen tilbage! Log ind for at fortsætte.")
      ).toBeInTheDocument();
      // None of the settings sections should render for an anonymous visitor
      expect(screen.queryByText("Kontoindstillinger")).not.toBeInTheDocument();
    });

    it("shows a spinner while auth is resolving", () => {
      mockLoadingRef.current = true;
      const { container } = renderPage();

      expect(container.querySelector(".animate-spin")).toBeInTheDocument();
      expect(screen.queryByText("Kontoindstillinger")).not.toBeInTheDocument();
    });
  });

  describe("Profile header", () => {
    it("renders name, email, member-since and bio", async () => {
      signIn();
      renderPage();

      const name = await screen.findByRole("heading", {
        level: 1,
        name: "Test Bruger",
      });
      // Scope to the header card — the bio text also appears in the settings
      // textarea further down the page.
      const header = name.closest(".glass") as HTMLElement;

      expect(header).toBeInTheDocument();
      expect(within(header).getByText("test@test.com")).toBeInTheDocument();
      expect(within(header).getByText(/Medlem siden/)).toBeInTheDocument();
      expect(within(header).getByText("Min bio")).toBeInTheDocument();
      expect(
        within(header).getByText("Se offentlig profil")
      ).toBeInTheDocument();
    });
  });

  describe("Purchases section", () => {
    it("shows the empty state with a browse CTA when there are no purchases", async () => {
      signIn();
      renderPage();

      expect(
        await screen.findByText("Du har ikke købt nogen kurser endnu.")
      ).toBeInTheDocument();
    });

    it("renders a card per purchased course with date and price", async () => {
      signIn();
      tableData.user_course_purchases = [MOCK_PURCHASE];
      renderPage();

      expect(await screen.findByText("Guitar Grundkursus")).toBeInTheDocument();
      expect(screen.getByText(/Købt/)).toBeInTheDocument();
      expect(screen.getByText("499 kr")).toBeInTheDocument();
    });
  });

  describe("Watchlist section", () => {
    it("shows the empty state when nothing is saved", async () => {
      signIn();
      mockWatchlistCourses.current = new Set();
      renderPage();

      expect(
        await screen.findByText("Du har ikke gemt noget endnu.")
      ).toBeInTheDocument();
    });

    it("renders saved courses that are still in the watchlist Set", async () => {
      signIn();
      tableData.user_watchlist = [MOCK_WATCHLIST_ROW];
      renderPage();

      await waitFor(() => {
        expect(screen.getByText("Lærer Lassen")).toBeInTheDocument();
      });
    });
  });

  describe("Account settings", () => {
    it("prefills name and bio and shows the email as read-only", async () => {
      signIn();
      renderPage();

      expect(await screen.findByDisplayValue("Test Bruger")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Min bio")).toBeInTheDocument();

      const email = screen.getByDisplayValue("test@test.com");
      expect(email).toHaveAttribute("readonly");
    });

    it("saves name, bio and notification prefs together", async () => {
      const user = userEvent.setup();
      signIn();
      renderPage();

      const nameInput = await screen.findByDisplayValue("Test Bruger");
      await user.clear(nameInput);
      await user.type(nameInput, "Nyt Navn");

      await user.click(screen.getByText("Gem ændringer"));

      await waitFor(() => {
        expect(updateProfileSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: "Nyt Navn",
            bio: "Min bio",
            notify_email: true,
            notify_course_updates: true,
            notify_newsletter: false,
            preferred_language: "da",
          })
        );
      });
    });
  });

  describe("Password change", () => {
    // The three password inputs share a placeholder and their labels are not
    // wired up with htmlFor, so they are addressed positionally:
    // [0] current, [1] new, [2] confirm.
    async function fillPasswords(current: string, next: string, confirm: string) {
      const user = userEvent.setup();
      const fields = await screen.findAllByPlaceholderText("••••••••");
      await user.type(fields[0], current);
      await user.type(fields[1], next);
      await user.type(fields[2], confirm);
      await user.click(screen.getByRole("button", { name: "Skift adgangskode" }));
    }

    it("rejects a password shorter than 8 characters", async () => {
      signIn();
      renderPage();

      await fillPasswords("oldpassword", "short", "short");

      expect(
        await screen.findByText("Adgangskoden skal være mindst 8 tegn.")
      ).toBeInTheDocument();
      expect(changePasswordSpy).not.toHaveBeenCalled();
    });

    it("rejects mismatched new passwords", async () => {
      signIn();
      renderPage();

      await fillPasswords("oldpassword", "longenough1", "longenough2");

      expect(
        await screen.findByText("Adgangskoderne matcher ikke.")
      ).toBeInTheDocument();
      expect(changePasswordSpy).not.toHaveBeenCalled();
    });

    it("submits a valid password change", async () => {
      signIn();
      renderPage();

      await fillPasswords("oldpassword", "longenough1", "longenough1");

      await waitFor(() => {
        expect(changePasswordSpy).toHaveBeenCalledWith(
          "oldpassword",
          "longenough1"
        );
      });
    });
  });

  describe("Delete account", () => {
    it("opens the confirmation modal and calls deleteAccount with the password", async () => {
      const user = userEvent.setup();
      signIn();
      renderPage();

      await user.click(await screen.findByText("Slet min konto"));

      expect(await screen.findByText("Er du helt sikker?")).toBeInTheDocument();
      expect(deleteAccountSpy).not.toHaveBeenCalled();

      // Opening the modal adds a fourth password input, which is the last one
      const fields = screen.getAllByPlaceholderText("••••••••");
      await user.type(fields[fields.length - 1], "mypassword");

      await user.click(screen.getByText("Slet permanent"));

      await waitFor(() => {
        expect(deleteAccountSpy).toHaveBeenCalledWith("mypassword");
      });
    });

    it("does not delete when the modal is cancelled", async () => {
      const user = userEvent.setup();
      signIn();
      renderPage();

      await user.click(await screen.findByText("Slet min konto"));
      await user.click(await screen.findByText("Annuller"));

      await waitFor(() => {
        expect(screen.queryByText("Er du helt sikker?")).not.toBeInTheDocument();
      });
      expect(deleteAccountSpy).not.toHaveBeenCalled();
    });
  });
});
