/**
 * Course-material (PDF) download tests.
 *
 * Two surfaces:
 *  - LessonPlayer: the download pill only renders for a buyer of a course that
 *    actually has a PDF attached. Both halves matter — a non-owner must not see
 *    it, and an owner of a course without material must not see a dead button.
 *  - CourseMaterialButton: exchanges a click for a signed URL from
 *    get-course-material and triggers the download, surfacing an error instead
 *    when the server refuses.
 *
 * The button is only a UI gate; get-course-material re-checks ownership on
 * every request. These tests cover the UI half — the server half is covered by
 * the Bruno e2e steps, which assert the paywall holds at the Storage layer.
 *
 * Approach mirrors tests/purchase.test.tsx: mock useAuth and the Supabase
 * client at module level, mock fetch for the edge-function round-trip.
 */

import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "../src/context/LanguageContext";
import CourseMaterialButton from "../src/components/CourseMaterialButton";
import LessonPlayer from "../src/pages/LessonPlayer";

// ── Auth mock ────────────────────────────────────────────────

type MockUser = { id: string; email: string } | null;
const mockUserRef: { current: MockUser } = { current: null };
const mockPurchasedRef: { current: Set<string> } = { current: new Set() };

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
    refreshPurchases: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

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

vi.mock("@mux/mux-player-react", () => ({
  default: (props: { playbackId: string }) => (
    <div data-testid="mux-player" data-playback-id={props.playbackId} />
  ),
}));

// ── Fixtures ─────────────────────────────────────────────────

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
  thumbnail_url: null,
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
  pdf_path: `${COURSE_ID}/materiale.pdf`,
  published: true,
  sort_order: 0,
  created_at: "2026-05-21T00:00:00Z",
  updated_at: "2026-05-21T00:00:00Z",
  lessons: [FREE_LESSON],
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
      // callEdgeFunction pulls a fresh session before POSTing
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "test-token", user: { id: "u1" } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: (table: string) => {
      if (table === "courses") return { select: coursesChain.select };
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    },
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-test");

const SIGNED_URL =
  "https://test.supabase.co/storage/v1/object/sign/course-materials/course-1/materiale.pdf?token=abc123";

/** Stand-in for the real navigation the anchor click would cause. */
const anchorClickSpy = vi.fn();

beforeEach(() => {
  mockUserRef.current = null;
  mockPurchasedRef.current = new Set();
  mockFetch.mockReset();
  anchorClickSpy.mockReset();
  mockCourseRow = COURSE;
  coursesChain = buildCoursesChain();
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    function (this: HTMLAnchorElement) {
      anchorClickSpy({ href: this.href, download: this.download });
    },
  );
});

function renderPlayer() {
  return render(
    <MemoryRouter initialEntries={[`/courses/${COURSE.slug}`]}>
      <LanguageProvider>
        <Routes>
          <Route path="/courses/:slug" element={<LessonPlayer />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

function renderButton() {
  return render(
    <LanguageProvider>
      <CourseMaterialButton courseId={COURSE_ID} />
    </LanguageProvider>,
  );
}

const downloadLabel = /Download kursusmateriale/i;

// ── Gating inside LessonPlayer ───────────────────────────────

describe("LessonPlayer course-material gating", () => {
  it("hides the download button from a logged-out visitor", async () => {
    renderPlayer();

    await screen.findByText("Testkursus");
    expect(screen.queryByRole("button", { name: downloadLabel })).toBeNull();
  });

  it("hides the download button from a logged-in non-owner", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };

    renderPlayer();

    await screen.findByText("Testkursus");
    expect(screen.queryByRole("button", { name: downloadLabel })).toBeNull();
  });

  it("hides the download button when the course has no PDF attached", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    mockPurchasedRef.current = new Set([COURSE_ID]);
    mockCourseRow = { ...COURSE, pdf_path: null };

    renderPlayer();

    await screen.findByText("Testkursus");
    expect(screen.queryByRole("button", { name: downloadLabel })).toBeNull();
  });

  it("shows the download button to an owner of a course that has a PDF", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    mockPurchasedRef.current = new Set([COURSE_ID]);

    renderPlayer();

    expect(
      await screen.findByRole("button", { name: downloadLabel }),
    ).toBeInTheDocument();
  });
});

// ── The button itself ────────────────────────────────────────

describe("CourseMaterialButton", () => {
  it("requests a signed URL and triggers the download", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        url: SIGNED_URL,
        filename: "test-course.pdf",
        expires_at: Math.floor(Date.now() / 1000) + 120,
      }),
    });

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: downloadLabel }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("https://test.supabase.co/functions/v1/get-course-material");
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
    // Only the course id travels — the server resolves the path and ownership.
    expect(JSON.parse((opts as RequestInit).body as string)).toEqual({
      course_id: COURSE_ID,
    });

    // The signed URL is handed to an anchor with a download attribute so the
    // browser saves the file without leaving the lesson page.
    await waitFor(() => expect(anchorClickSpy).toHaveBeenCalledTimes(1));
    expect(anchorClickSpy).toHaveBeenCalledWith({
      href: SIGNED_URL,
      download: "test-course.pdf",
    });
  });

  it("shows an error and downloads nothing when the server answers NOT_OWNED", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: "You do not own this course",
        code: "NOT_OWNED",
      }),
    });

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: downloadLabel }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Filen kunne ikke hentes/i,
    );
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });

  it("shows an error when the request fails outright", async () => {
    mockUserRef.current = { id: "u1", email: "u@test.com" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      // A 200 with no url is as unusable as a failure — treat it the same.
      json: async () => ({}),
    });

    renderButton();
    await userEvent.click(screen.getByRole("button", { name: downloadLabel }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(anchorClickSpy).not.toHaveBeenCalled();
  });
});
