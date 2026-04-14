import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { LanguageProvider } from "../src/context/LanguageContext";
import { AuthProvider } from "../src/context/AuthContext";
import News from "../src/pages/News";

// ── Mock data ────────────────────────────────────────────────

const MOCK_NEWS = [
  {
    id: "news-1",
    author_id: "admin-1",
    title_da: "Test Nyhed Titel",
    title_en: "Test News Title",
    body_da: "Dette er en test nyhed med dansk indhold.",
    body_en: "This is a test news article with English content.",
    image_url: "https://example.com/image.jpg",
    published: true,
    created_at: "2026-04-10T12:00:00Z",
    updated_at: "2026-04-10T12:00:00Z",
  },
  {
    id: "news-2",
    author_id: "admin-1",
    title_da: "Anden Nyhed",
    title_en: "Second News",
    body_da: "K".repeat(500),
    body_en: "L".repeat(500),
    image_url: null,
    published: true,
    created_at: "2026-04-09T12:00:00Z",
    updated_at: "2026-04-09T12:00:00Z",
  },
];

// ── Supabase mock ────────────────────────────────────────────

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

// Builds a chainable mock matching .from("news").select("*").eq("published", true).order(...)
let mockNewsData: unknown[] = MOCK_NEWS;
let mockNewsError: unknown = null;

function buildNewsChain() {
  const orderFn = vi
    .fn()
    .mockReturnValue({ data: mockNewsData, error: mockNewsError });
  const eqFn = vi.fn().mockReturnValue({ order: orderFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  return { selectFn, eqFn, orderFn };
}

let newsChain = buildNewsChain();

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
      if (table === "news") {
        return { select: newsChain.selectFn };
      }
      // Profiles table for AuthContext
      if (table === "profiles") {
        const singleFn = vi.fn().mockReturnValue({ data: null, error: null });
        const eqFn = vi.fn().mockReturnValue({ single: singleFn });
        return { select: vi.fn().mockReturnValue({ eq: eqFn }) };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "" } }),
      }),
    },
  },
}));

// ── Helper wrapper ───────────────────────────────────────────

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>{children}</AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

// ── Tests ────────────────────────────────────────────────────

describe("News Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNewsData = MOCK_NEWS;
    mockNewsError = null;
    newsChain = buildNewsChain();
  });

  it("renders the news page title and subtitle", async () => {
    render(<News />, { wrapper: Wrapper });

    // Default language is DA
    await waitFor(() => {
      expect(screen.getAllByText("Nyheder").length).toBeGreaterThan(0);
    });
    expect(
      screen.getByText("Seneste nyt fra Lassen Music Academy")
    ).toBeInTheDocument();
  });

  it("displays published news articles in Danish by default", async () => {
    render(<News />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Test Nyhed Titel")).toBeInTheDocument();
    });
    expect(screen.getByText("Anden Nyhed")).toBeInTheDocument();
  });

  it("shows article body text", async () => {
    render(<News />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByText("Dette er en test nyhed med dansk indhold.")
      ).toBeInTheDocument();
    });
  });

  it("renders article image when image_url is present", async () => {
    render(<News />, { wrapper: Wrapper });

    await waitFor(() => {
      const img = screen.getByAltText("Test Nyhed Titel");
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", "https://example.com/image.jpg");
    });
  });

  it("does not render image when image_url is null", async () => {
    render(<News />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText("Anden Nyhed")).toBeInTheDocument();
    });
    // Second article has no image
    expect(screen.queryByAltText("Anden Nyhed")).not.toBeInTheDocument();
  });

  it("shows empty state when no news articles exist", async () => {
    mockNewsData = [];
    newsChain = buildNewsChain();

    render(<News />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(
        screen.getByText("Ingen nyheder endnu — kom tilbage snart!")
      ).toBeInTheDocument();
    });
  });

  it("shows 'Læs mere' button for long articles and expands on click", async () => {
    render(<News />, { wrapper: Wrapper });

    // Second article has 500 chars which exceeds the 400 char preview limit
    await waitFor(() => {
      expect(screen.getByText("Læs mere")).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText("Læs mere"));

    // After expanding, button text changes to "Læs mindre"
    expect(screen.getByText("Læs mindre")).toBeInTheDocument();
  });

  it("formats dates in Danish locale", async () => {
    render(<News />, { wrapper: Wrapper });

    await waitFor(() => {
      // April 10, 2026 in Danish
      expect(screen.getByText("10. april 2026")).toBeInTheDocument();
    });
  });

  it("queries only published news", async () => {
    render(<News />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(newsChain.selectFn).toHaveBeenCalledWith("*");
    });
    // .eq("published", true) should have been called
    expect(newsChain.eqFn).toHaveBeenCalledWith("published", true);
  });

  it("orders news by created_at descending", async () => {
    render(<News />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(newsChain.orderFn).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });
  });
});
