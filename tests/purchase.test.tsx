/**
 * Purchase-flow tests.
 *
 * Covers two surfaces of the per-course purchase model:
 *  - BuyCourseModal: POSTs to create-course-purchase, surfaces the test-mode
 *    notice, and refreshes purchases on success.
 *  - LessonPlayer: gates non-preview lessons behind ownership — free preview
 *    plays for everyone, locked lessons show the buy CTA, owned courses
 *    play locked lessons.
 *
 * Approach: mock useAuth (avoiding real Supabase auth wiring) and mock fetch
 * for the edge function call. Supabase client is mocked at module level so
 * the course fetch in LessonPlayer can return our fixtures.
 */

import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "../src/context/LanguageContext";
import BuyCourseModal from "../src/components/BuyCourseModal";
import LessonPlayer from "../src/pages/LessonPlayer";

// ── Auth mock ────────────────────────────────────────────────
// useAuth returns mutable state controlled by each test. WatchlistContext is
// only used to satisfy LessonPlayer's tree; not exercised here.

type MockUser = { id: string; email: string } | null;
const mockUserRef: { current: MockUser } = { current: null };
const mockPurchasedRef: { current: Set<string> } = { current: new Set() };
const refreshPurchasesSpy = vi.fn(async () => {});

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: mockUserRef.current,
    session: mockUserRef.current ? { user: mockUserRef.current } : null,
    profile: mockUserRef.current
      ? { id: mockUserRef.current.id, full_name: "Test", image_url: null }
      : null,
    loading: false,
    isAdmin: false,
    purchasedCourseIds: mockPurchasedRef.current,
    signUp: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    changePassword: vi.fn(),
    resetPasswordRequest: vi.fn(),
    resetPassword: vi.fn(),
    refreshProfile: vi.fn(),
    refreshPurchases: refreshPurchasesSpy,
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

// WatchlistContext stub — LessonPlayer imports WatchlistButton, which calls
// useWatchlist().isSaved / .toggle / etc. We mock enough of that surface.
vi.mock("../src/context/WatchlistContext", () => ({
  WatchlistProvider: ({ children }: { children: ReactNode }) => children,
  useWatchlist: () => ({
    courses: new Set<string>(),
    lessons: new Set<string>(),
    loading: false,
    isSaved: () => false,
    toggle: vi.fn(),
    toggleCourse: vi.fn(),
    toggleLesson: vi.fn(),
  }),
}));

// WatchProgressContext stub — LessonPlayer uses useWatchProgress for progress tracking
vi.mock("../src/context/WatchProgressContext", () => ({
  WatchProgressProvider: ({ children }: { children: ReactNode }) => children,
  useWatchProgress: () => ({
    loading: false,
    progressEntries: [],
    isCompleted: () => false,
    getPosition: () => 0,
    getProgressFraction: () => 0,
    completedCountForCourse: () => 0,
    saveProgress: vi.fn(),
  }),
}));

// ── Mux player mock ─────────────────────────────────────────

const muxPlayerSpy = vi.fn();
vi.mock("@mux/mux-player-react", () => ({
  default: (props: { playbackId: string }) => {
    muxPlayerSpy(props);
    return <div data-testid="mux-player" data-playback-id={props.playbackId} />;
  },
}));

// ── Supabase mock ────────────────────────────────────────────

const COURSE_ID = "course-1";
const FREE_LESSON = {
  id: "lesson-1",
  course_id: COURSE_ID,
  slug: "lektion-1",
  title_da: "Lektion 1",
  title_en: "Lesson 1",
  description_da: null,
  description_en: null,
  mux_playback_id: "freeABC",
  mux_asset_id: "asset-free",
  mux_playback_policy: "public",
  is_free_preview: true,
  duration_seconds: 100,
  aspect_ratio: "16:9",
  sort_order: 0,
  published: true,
  created_at: "2026-05-21T00:00:00Z",
  updated_at: "2026-05-21T00:00:00Z",
};
const PAID_LESSON = {
  ...FREE_LESSON,
  id: "lesson-2",
  slug: "lektion-2",
  title_da: "Lektion 2",
  title_en: "Lesson 2",
  mux_playback_id: "paidXYZ",
  is_free_preview: false,
  sort_order: 1,
};
const COURSE = {
  id: COURSE_ID,
  slug: "test-course",
  title_da: "Testkursus",
  title_en: "Test Course",
  level_da: "Begynder",
  level_en: "Beginner",
  description_da: null,
  description_en: null,
  instructor: "Kristian Lassen",
  image_url: "https://example.com/c.webp",
  tags: ["guitar"],
  access_tier: null,
  price_dkk: 199,
  published: true,
  sort_order: 0,
  created_at: "2026-05-21T00:00:00Z",
  updated_at: "2026-05-21T00:00:00Z",
  lessons: [FREE_LESSON, PAID_LESSON],
};

let mockCourseRow: unknown = COURSE;

function buildCoursesChain() {
  const maybeSingle = vi.fn().mockImplementation(async () => ({
    data: mockCourseRow,
    error: null,
  }));
  const eqLessonsPublished = vi.fn().mockReturnValue({ maybeSingle });
  const eqPublished = vi.fn().mockReturnValue({ eq: eqLessonsPublished });
  const eqSlug = vi.fn().mockReturnValue({ eq: eqPublished });
  const select = vi.fn().mockReturnValue({ eq: eqSlug });
  return { select };
}
let coursesChain = buildCoursesChain();

vi.mock("../src/supabase/client", () => ({
  supabase: {
    auth: {
      // BuyCourseModal pulls a fresh session before POSTing the purchase
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token", user: { id: "u1" } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: (table: string) => {
      if (table === "courses") return { select: coursesChain.select };
      // Catchall for any other table (profiles etc.) — return empty
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    },
  },
}));

// ── Fetch mock — covers create-course-purchase ───────────────

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock import.meta.env so the modal can build the edge-function URL.
// Vitest doesn't expose import.meta.env defaults the way Vite dev does.
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-test");

// ── Helpers ──────────────────────────────────────────────────

function renderModal(props?: Partial<React.ComponentProps<typeof BuyCourseModal>>) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    course: { id: COURSE_ID, title: "Test Course", price_dkk: 199 },
  };
  return render(
    <LanguageProvider>
      <BuyCourseModal {...defaults} {...props} />
    </LanguageProvider>,
  );
}

function renderPlayer(lessonSlug?: string) {
  const path = lessonSlug
    ? `/courses/${COURSE.slug}/${lessonSlug}`
    : `/courses/${COURSE.slug}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <Routes>
          <Route path="/courses/:slug" element={<LessonPlayer />} />
          <Route path="/courses/:slug/:lessonSlug" element={<LessonPlayer />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockUserRef.current = null;
  mockPurchasedRef.current = new Set();
  refreshPurchasesSpy.mockClear();
  muxPlayerSpy.mockClear();
  mockFetch.mockReset();
  mockCourseRow = COURSE;
  coursesChain = buildCoursesChain();
});

// ── BuyCourseModal tests ─────────────────────────────────────

describe("BuyCourseModal", () => {
  it("renders price and test-mode notice when open", () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    renderModal();

    expect(screen.getByText("Test Course")).toBeInTheDocument();
    expect(screen.getByText("199 kr")).toBeInTheDocument();
    // Test-mode notice should be visible while we're on mock payments
    expect(screen.getByText(/TEST-tilstand/i)).toBeInTheDocument();
  });

  it("POSTs to create-course-purchase and refreshes purchases on success", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        purchase: { id: "p1", course_id: COURSE_ID },
        already_owned: false,
      }),
    });

    renderModal();

    await userEvent.click(screen.getByRole("button", { name: /Betal/i }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    // Verify the edge-function URL, auth header and body
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "https://test.supabase.co/functions/v1/create-course-purchase",
    );
    expect((opts as RequestInit).method).toBe("POST");
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    expect(JSON.parse((opts as RequestInit).body as string)).toEqual({
      course_id: COURSE_ID,
    });

    // Success state should render and purchases should be refreshed
    await waitFor(() =>
      expect(screen.getByText(/Tak for dit køb/i)).toBeInTheDocument(),
    );
    expect(refreshPurchasesSpy).toHaveBeenCalledTimes(1);
  });

  it("surfaces a server error to the user without flipping to success", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Course not for sale", code: "NOT_FOR_SALE" }),
    });

    renderModal();
    await userEvent.click(screen.getByRole("button", { name: /Betal/i }));

    await waitFor(() =>
      expect(screen.getByText("Course not for sale")).toBeInTheDocument(),
    );
    expect(refreshPurchasesSpy).not.toHaveBeenCalled();
    // Still on the purchase form, not the success state
    expect(screen.queryByText(/Tak for dit køb/i)).not.toBeInTheDocument();
  });
});

// ── LessonPlayer gating tests ────────────────────────────────

describe("LessonPlayer gating", () => {
  it("plays the free-preview lesson for a guest", async () => {
    mockUserRef.current = null;
    mockPurchasedRef.current = new Set();

    renderPlayer("lektion-1");

    await waitFor(() =>
      expect(screen.getByTestId("mux-player")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("mux-player")).toHaveAttribute(
      "data-playback-id",
      "freeABC",
    );
    // No locked panel
    expect(screen.queryByText(/Lås resten af kurset op/i)).not.toBeInTheDocument();
  });

  it("locks a paid lesson for a non-owner and shows the buy CTA", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    mockPurchasedRef.current = new Set();

    renderPlayer("lektion-2");

    // Locked panel renders the paid CTA, not the player
    await waitFor(() =>
      expect(screen.getByText(/Lås resten af kurset op/i)).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("mux-player")).not.toBeInTheDocument();
    // Buy CTA visible with the course price embedded
    expect(
      screen.getByRole("button", { name: /Køb kursus/i }),
    ).toBeInTheDocument();
  });

  it("plays a paid lesson when the user owns the course", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    mockPurchasedRef.current = new Set([COURSE_ID]);

    renderPlayer("lektion-2");

    await waitFor(() =>
      expect(screen.getByTestId("mux-player")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("mux-player")).toHaveAttribute(
      "data-playback-id",
      "paidXYZ",
    );
    expect(
      screen.queryByText(/Lås resten af kurset op/i),
    ).not.toBeInTheDocument();
  });
});
