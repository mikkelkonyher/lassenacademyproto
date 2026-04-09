import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "../src/context/LanguageContext";
import Community from "../src/pages/Community";

// ── Mock data ────────────────────────────────────────────────

const MOCK_USER = { id: "user-1", email: "test@test.com" };
const OTHER_USER = { id: "user-2", email: "other@test.com" };

const MOCK_POST = {
  id: "post-1",
  user_id: MOCK_USER.id,
  category: "guitar",
  title: "Test Post Title",
  body: "Test post body content",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  profiles: { full_name: "Test User", image_url: null },
  forum_comments: [
    {
      id: "comment-1",
      post_id: "post-1",
      user_id: OTHER_USER.id,
      body: "A comment from another user",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: { full_name: "Other User", image_url: null },
    },
    {
      id: "comment-2",
      post_id: "post-1",
      user_id: MOCK_USER.id,
      body: "My own comment",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: { full_name: "Test User", image_url: null },
    },
  ],
};

const MOCK_OTHER_POST = {
  id: "post-2",
  user_id: OTHER_USER.id,
  category: "bass",
  title: "Other User Post",
  body: "Post by another user",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  profiles: { full_name: "Other User", image_url: null },
  forum_comments: [],
};

// ── Supabase mock ────────────────────────────────────────────

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

function buildChain(resolvedData: unknown = [], resolvedError: unknown = null) {
  const limitFn = vi
    .fn()
    .mockReturnValue({ data: resolvedData, error: resolvedError });
  const orderFn = vi
    .fn()
    .mockReturnValue({ data: resolvedData, error: resolvedError, limit: limitFn });
  const eqFn = vi
    .fn()
    .mockReturnValue({ data: resolvedData, error: resolvedError, order: orderFn });

  const selectFn = vi.fn().mockReturnValue({
    order: orderFn,
    eq: eqFn,
  });

  const insertFn = vi
    .fn()
    .mockResolvedValue({ data: null, error: resolvedError });

  const updateEq = vi
    .fn()
    .mockResolvedValue({ data: null, error: resolvedError });
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

  const deleteEq = vi
    .fn()
    .mockResolvedValue({ data: null, error: resolvedError });
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEq });

  return {
    selectFn,
    insertFn,
    updateFn,
    deleteFn,
    orderFn,
    eqFn,
    updateEq,
    deleteEq,
  };
}

let chain = buildChain([MOCK_POST, MOCK_OTHER_POST]);

vi.mock("../src/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
    },
    from: (table: string) => {
      if (table === "forum_posts" || table === "forum_comments") {
        return {
          select: chain.selectFn,
          insert: chain.insertFn,
          update: chain.updateFn,
          delete: chain.deleteFn,
        };
      }
      if (table === "forum_notifications") {
        // Notifications query chains: .select().eq().order().limit()
        const limitFn = vi.fn().mockReturnValue({ data: [], error: null });
        const orderFn = vi.fn().mockReturnValue({ data: [], error: null, limit: limitFn });
        const eqFn = vi.fn().mockReturnValue({ order: orderFn });
        return {
          select: vi.fn().mockReturnValue({ eq: eqFn }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    },
  },
}));

// ── Auth context mock ────────────────────────────────────────

let mockCurrentUser: typeof MOCK_USER | null = null;

// Mock fetch for edge function calls (mutations go through fetch, not supabase client)
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    session: mockCurrentUser ? { user: mockCurrentUser } : null,
    profile: mockCurrentUser
      ? { id: mockCurrentUser.id, full_name: "Test User", image_url: null }
      : null,
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

// ── Helpers ──────────────────────────────────────────────────

function renderCommunity() {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <Community />
      </LanguageProvider>
    </BrowserRouter>,
  );
}

/** Get the main content area (excludes nav/footer) */
function getMain() {
  // The main content is inside pt-24 pb-16 div
  const headings = screen.getAllByText("Fællesskab");
  const h1 = headings.find((el) => el.tagName === "H1");
  // Return the closest container
  return h1!.closest(".max-w-4xl") as HTMLElement;
}

// ── Tests ────────────────────────────────────────────────────

describe("Community Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCurrentUser = null;
    chain = buildChain([MOCK_POST, MOCK_OTHER_POST]);
    // happy-dom doesn't define window.confirm
    window.confirm = vi.fn();
    // Default fetch mock for edge function calls (returns success)
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, post_id: "new-post-1", comment_id: "new-comment-1" }),
    });
    // Default getSession mock for authenticated calls
    mockGetSession.mockResolvedValue({
      data: { session: null },
    });
  });

  // ── Rendering ──

  describe("Rendering", () => {
    it("renders the page title and subtitle", async () => {
      renderCommunity();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { level: 1, name: "Fællesskab" }),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByText("Diskuter musik, del tips og lær af hinanden"),
      ).toBeInTheDocument();
    });

    it("renders category filter buttons in main content", async () => {
      renderCommunity();

      await waitFor(() => {
        expect(
          screen.getByRole("heading", { level: 1, name: "Fællesskab" }),
        ).toBeInTheDocument();
      });

      // Category filter buttons have rounded-full class
      const filterButtons = document.querySelectorAll("button.rounded-full");
      const buttonTexts = Array.from(filterButtons).map((b) =>
        b.textContent?.trim(),
      );

      expect(buttonTexts).toContain("Alle");
      expect(buttonTexts).toContain("Generelt");
      expect(buttonTexts).toContain("Guitar");
      expect(buttonTexts).toContain("Bas");
      expect(buttonTexts).toContain("Klaver");
      expect(buttonTexts).toContain("Sang");
      expect(buttonTexts).toContain("Teori");
    });

    it("renders posts from Supabase", async () => {
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });
      expect(screen.getByText("Other User Post")).toBeInTheDocument();
    });

    it("shows post count", async () => {
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Viser 2 opslag")).toBeInTheDocument();
      });
    });

    it("shows loading state", () => {
      chain.selectFn.mockReturnValue({
        order: vi.fn().mockReturnValue(new Promise(() => {})),
      });

      renderCommunity();
      expect(screen.getByText("Indlæser opslag...")).toBeInTheDocument();
    });

    it("shows error state when fetch fails", async () => {
      chain = buildChain(null, { message: "fetch failed" });
      renderCommunity();

      await waitFor(() => {
        expect(
          screen.getByText("Kunne ikke indlæse opslag. Prøv igen."),
        ).toBeInTheDocument();
      });
    });

    it("shows empty state when no posts match", async () => {
      chain = buildChain([]);
      renderCommunity();

      await waitFor(() => {
        expect(
          screen.getByText("Ingen opslag matcher din søgning"),
        ).toBeInTheDocument();
      });
    });
  });

  // ── Search & Filter ──

  describe("Search and Filter", () => {
    it("filters posts by search query", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText("Søg i opslag...");
      await user.type(searchInput, "Other User");

      expect(screen.queryByText("Test Post Title")).not.toBeInTheDocument();
      expect(screen.getByText("Other User Post")).toBeInTheDocument();
    });

    it("filters posts by category", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      // Click "Bas" category button (the filter pill, not other occurrences)
      const main = getMain();
      const basButtons = within(main).getAllByText("Bas");
      // The category filter button is the one in the filter bar
      const filterButton = basButtons.find((el) =>
        el.closest("button")?.classList.contains("rounded-full"),
      );
      await user.click(filterButton!.closest("button")!);

      expect(screen.queryByText("Test Post Title")).not.toBeInTheDocument();
      expect(screen.getByText("Other User Post")).toBeInTheDocument();
    });

    it('shows all posts when "Alle" category is selected', async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      const main = getMain();

      // Filter to bass first
      const basButtons = within(main).getAllByText("Bas");
      const basFilter = basButtons.find((el) =>
        el.closest("button")?.classList.contains("rounded-full"),
      );
      await user.click(basFilter!.closest("button")!);
      expect(screen.queryByText("Test Post Title")).not.toBeInTheDocument();

      // Click "Alle" to show all
      await user.click(within(main).getByText("Alle"));
      expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      expect(screen.getByText("Other User Post")).toBeInTheDocument();
    });
  });

  // ── Post Expansion ──

  describe("Post Expansion", () => {
    it("expands post to show body and comments when clicked", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      expect(
        screen.queryByText("Test post body content"),
      ).not.toBeInTheDocument();

      await user.click(screen.getByText("Test Post Title"));

      expect(screen.getByText("Test post body content")).toBeInTheDocument();
      expect(
        screen.getByText("A comment from another user"),
      ).toBeInTheDocument();
      expect(screen.getByText("My own comment")).toBeInTheDocument();
    });

    it("collapses post when clicked again", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      expect(screen.getByText("Test post body content")).toBeInTheDocument();

      await user.click(screen.getByText("Test Post Title"));
      expect(
        screen.queryByText("Test post body content"),
      ).not.toBeInTheDocument();
    });
  });

  // ── Logged-out User ──

  describe("Logged-out User", () => {
    it("shows login prompt instead of new post button", async () => {
      renderCommunity();

      await waitFor(() => {
        expect(
          screen.getByText("Log ind for at skrive opslag"),
        ).toBeInTheDocument();
      });
      expect(screen.queryByText("Nyt opslag")).not.toBeInTheDocument();
    });

    it("shows login prompt in comment area when post is expanded", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));

      expect(screen.getByText("Log ind for at kommentere")).toBeInTheDocument();
    });
  });

  // ── Logged-in User: Posts ──

  describe("Logged-in User - Posts", () => {
    beforeEach(() => {
      mockCurrentUser = MOCK_USER;
      // Edge functions need an active session for auth
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "test-token", user: MOCK_USER } },
      });
    });

    it("shows new post button when logged in", async () => {
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Nyt opslag")).toBeInTheDocument();
      });
    });

    it("toggles create post form when new post button is clicked", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Nyt opslag")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Nyt opslag"));
      expect(
        screen.getByPlaceholderText("Titel på dit opslag..."),
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Skriv dit opslag her..."),
      ).toBeInTheDocument();
      expect(screen.getByText("Opret opslag")).toBeInTheDocument();

      // Close form
      await user.click(screen.getByText("Annuller"));
      expect(
        screen.queryByPlaceholderText("Titel på dit opslag..."),
      ).not.toBeInTheDocument();
    });

    it("submits a new post", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Nyt opslag")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Nyt opslag"));

      await user.type(
        screen.getByPlaceholderText("Titel på dit opslag..."),
        "My New Post",
      );
      await user.type(
        screen.getByPlaceholderText("Skriv dit opslag her..."),
        "This is the body of my new post",
      );

      await user.click(screen.getByText("Opret opslag"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/functions/v1/create-forum-post"),
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({
              title: "My New Post",
              body: "This is the body of my new post",
              category: "general",
            }),
          }),
        );
      });
    });

    it("shows edit and delete buttons only on own posts", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      // Expand own post
      await user.click(screen.getByText("Test Post Title"));
      expect(screen.getByText("Rediger opslag")).toBeInTheDocument();
      expect(screen.getByText("Slet opslag")).toBeInTheDocument();

      // Collapse and expand other user's post
      await user.click(screen.getByText("Test Post Title"));
      await user.click(screen.getByText("Other User Post"));
      expect(screen.queryByText("Rediger opslag")).not.toBeInTheDocument();
      expect(screen.queryByText("Slet opslag")).not.toBeInTheDocument();
    });

    it("shows edit form when edit button is clicked", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      await user.click(screen.getByText("Rediger opslag"));

      expect(screen.getByDisplayValue("Test Post Title")).toBeInTheDocument();
      expect(screen.getByText("Annuller")).toBeInTheDocument();
      expect(screen.getByText("Gem ændringer")).toBeInTheDocument();
    });

    it("submits post update", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      await user.click(screen.getByText("Rediger opslag"));

      const titleInput = screen.getByDisplayValue("Test Post Title");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Title");

      await user.click(screen.getByText("Gem ændringer"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/functions/v1/update-forum-post"),
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("Updated Title"),
          }),
        );
      });
    });

    it("calls delete on own post when confirmed", async () => {
      vi.mocked(window.confirm).mockReturnValue(true);
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      await user.click(screen.getByText("Slet opslag"));

      expect(window.confirm).toHaveBeenCalledWith(
        "Er du sikker på, at du vil slette dette opslag?",
      );
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/functions/v1/delete-forum-post"),
          expect.objectContaining({ method: "POST" }),
        );
      });

      vi.mocked(window.confirm).mockReset();
    });

    it("does not delete post when confirm is cancelled", async () => {
      vi.mocked(window.confirm).mockReturnValue(false);
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      await user.click(screen.getByText("Slet opslag"));

      expect(mockFetch).not.toHaveBeenCalledWith(
        expect.stringContaining("/functions/v1/delete-forum-post"),
        expect.anything(),
      );
      vi.mocked(window.confirm).mockReset();
    });
  });

  // ── Logged-in User: Comments ──

  describe("Logged-in User - Comments", () => {
    beforeEach(() => {
      mockCurrentUser = MOCK_USER;
      // Edge functions need an active session for auth
      mockGetSession.mockResolvedValue({
        data: { session: { access_token: "test-token", user: MOCK_USER } },
      });
    });

    it("shows reply input when logged in", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      expect(
        screen.getByPlaceholderText("Skriv et svar..."),
      ).toBeInTheDocument();
    });

    it("submits a new comment", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));

      const replyInput = screen.getByPlaceholderText("Skriv et svar...");
      await user.type(replyInput, "My new comment");

      // Click the reply button next to the input
      const replyButtons = screen.getAllByText("Svar");
      const replyButton = replyButtons[replyButtons.length - 1];
      await user.click(replyButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/functions/v1/create-forum-comment"),
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("My new comment"),
          }),
        );
      });
    });

    it("shows edit/delete buttons only on own comments", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));

      // Should have exactly 1 edit and 1 delete button (for own comment only)
      const editButtons = screen.getAllByText("Rediger");
      const deleteCommentButtons = screen.getAllByText("Slet kommentar");

      expect(editButtons.length).toBe(1);
      expect(deleteCommentButtons.length).toBe(1);
    });

    it("shows edit form for own comment", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      await user.click(screen.getByText("Rediger"));

      expect(screen.getByDisplayValue("My own comment")).toBeInTheDocument();
      expect(screen.getByText("Gem")).toBeInTheDocument();
      expect(screen.getByText("Annuller")).toBeInTheDocument();
    });

    it("submits comment update", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      await user.click(screen.getByText("Rediger"));

      const input = screen.getByDisplayValue("My own comment");
      await user.clear(input);
      await user.type(input, "Updated comment");

      await user.click(screen.getByText("Gem"));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/functions/v1/update-forum-comment"),
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("Updated comment"),
          }),
        );
      });
    });

    it("cancels comment edit", async () => {
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      await user.click(screen.getByText("Rediger"));

      expect(screen.getByDisplayValue("My own comment")).toBeInTheDocument();

      await user.click(screen.getByText("Annuller"));

      expect(
        screen.queryByDisplayValue("My own comment"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("My own comment")).toBeInTheDocument();
    });

    it("calls delete on own comment when confirmed", async () => {
      vi.mocked(window.confirm).mockReturnValue(true);
      const user = userEvent.setup();
      renderCommunity();

      await waitFor(() => {
        expect(screen.getByText("Test Post Title")).toBeInTheDocument();
      });

      await user.click(screen.getByText("Test Post Title"));
      await user.click(screen.getByText("Slet kommentar"));

      expect(window.confirm).toHaveBeenCalledWith(
        "Er du sikker på, at du vil slette denne kommentar?",
      );
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/functions/v1/delete-forum-comment"),
          expect.objectContaining({ method: "POST" }),
        );
      });

      vi.mocked(window.confirm).mockReset();
    });
  });
});
