import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "../src/context/LanguageContext";
import { AuthProvider } from "../src/context/AuthContext";
import { WatchlistProvider } from "../src/context/WatchlistContext";
import { WatchProgressProvider } from "../src/context/WatchProgressContext";
import LessonPlayer from "../src/pages/LessonPlayer";

// ── Mock data ────────────────────────────────────────────────

// is_free_preview: true on both lessons so these tests focus on the
// "video present vs absent" behavior. Purchase gating is covered separately
// in tests/purchase.test.tsx.
const LESSON_WITH_VIDEO = {
  id: "lesson-1",
  course_id: "course-1",
  slug: "modul-1",
  title_da: "Modul 1: Introduktion",
  title_en: "Module 1: Introduction",
  description_da: "Velkommen til kurset.",
  description_en: "Welcome to the course.",
  mux_playback_id: "abc123XYZ",
  mux_asset_id: "asset-xyz",
  mux_playback_policy: "public",
  is_free_preview: true,
  duration_seconds: 156,
  aspect_ratio: "16:9",
  sort_order: 0,
  published: true,
  created_at: "2026-05-21T00:00:00Z",
  updated_at: "2026-05-21T00:00:00Z",
};

const LESSON_NO_VIDEO = {
  ...LESSON_WITH_VIDEO,
  id: "lesson-2",
  slug: "modul-2",
  title_da: "Modul 2",
  title_en: "Module 2",
  mux_playback_id: null,
  duration_seconds: null,
  sort_order: 1,
};

const COURSE = {
  id: "course-1",
  slug: "begynder-guitar-fra-0-til-helt",
  title_da: "Begynder Guitar: Fra 0 til Helt",
  title_en: "Beginner Guitar: From 0 to Hero",
  level_da: "Begynder",
  level_en: "Beginner",
  description_da: "Lær guitar.",
  description_en: "Learn guitar.",
  instructor: "Ludwig Hamilton-Wittendorff",
  image_url: "https://example.com/guitar.webp",
  tags: ["Guitar"],
  access_tier: "free",
  published: true,
  sort_order: 0,
  created_at: "2026-05-21T00:00:00Z",
  updated_at: "2026-05-21T00:00:00Z",
  lessons: [LESSON_WITH_VIDEO, LESSON_NO_VIDEO],
};

// ── Mux player mock ─────────────────────────────────────────

const muxPlayerSpy = vi.fn();
vi.mock("@mux/mux-player-react", () => ({
  default: (props: { playbackId: string }) => {
    muxPlayerSpy(props);
    return <div data-testid="mux-player" data-playback-id={props.playbackId} />;
  },
}));

// ── Supabase mock ────────────────────────────────────────────

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

let mockCourseRow: unknown = COURSE;

function buildCoursesChain() {
  const maybeSingleFn = vi.fn().mockImplementation(async () => ({
    data: mockCourseRow,
    error: null,
  }));
  const eqLessonsPublishedFn = vi
    .fn()
    .mockReturnValue({ maybeSingle: maybeSingleFn });
  const eqPublishedFn = vi
    .fn()
    .mockReturnValue({ eq: eqLessonsPublishedFn });
  const eqSlugFn = vi.fn().mockReturnValue({ eq: eqPublishedFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqSlugFn });
  return { selectFn };
}

let coursesChain = buildCoursesChain();

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
      if (table === "courses") return { select: coursesChain.selectFn };
      if (table === "profiles") {
        const singleFn = vi.fn().mockReturnValue({ data: null, error: null });
        const eqFn = vi.fn().mockReturnValue({ single: singleFn });
        return { select: vi.fn().mockReturnValue({ eq: eqFn }) };
      }
      // AuthContext fetches user_course_purchases on session restore.
      // Tests run as a guest user → return an empty list.
      if (table === "user_course_purchases") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({ data: [], error: null }),
          }),
        }),
      };
    },
  },
}));

function renderWithPath(slug: string, lessonSlug?: string) {
  const path = lessonSlug ? `/courses/${slug}/${lessonSlug}` : `/courses/${slug}`;
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <AuthProvider>
          <WatchlistProvider>
          <WatchProgressProvider>
            <Routes>
              <Route path="/courses/:slug" element={<LessonPlayer />} />
              <Route path="/courses/:slug/:lessonSlug" element={<LessonPlayer />} />
            </Routes>
          </WatchProgressProvider>
          </WatchlistProvider>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

function reset(row: unknown) {
  vi.clearAllMocks();
  muxPlayerSpy.mockClear();
  mockCourseRow = row;
  coursesChain = buildCoursesChain();
}

// ── Tests ────────────────────────────────────────────────────

describe("LessonPlayer page", () => {
  beforeEach(() => {
    reset(COURSE);
  });

  it("renders MuxPlayer with the lesson's playback id when video is available", async () => {
    reset(COURSE);
    renderWithPath("begynder-guitar-fra-0-til-helt", "modul-1");

    // Title appears in two places: the h1 below the player AND the sidebar
    // subtitle under "Modul N". Both should render.
    await waitFor(() =>
      expect(screen.getAllByText("Modul 1: Introduktion").length).toBeGreaterThanOrEqual(1)
    );

    const player = screen.getByTestId("mux-player");
    expect(player).toHaveAttribute("data-playback-id", "abc123XYZ");
    expect(muxPlayerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ playbackId: "abc123XYZ" })
    );
  });

  it("renders the Coming Soon placeholder when the lesson has no video yet", async () => {
    reset(COURSE);
    renderWithPath("begynder-guitar-fra-0-til-helt", "modul-2");

    await waitFor(() =>
      expect(screen.getByText(/Video kommer snart/i)).toBeInTheDocument()
    );
    expect(screen.queryByTestId("mux-player")).not.toBeInTheDocument();
  });

  it("renders the lesson-not-found state for an unknown lessonSlug", async () => {
    reset(COURSE);
    renderWithPath("begynder-guitar-fra-0-til-helt", "modul-99");

    await waitFor(() =>
      expect(screen.getByText(/Lektionen blev ikke fundet/i)).toBeInTheDocument()
    );
  });

  it("renders the course-not-found state when the course returns null", async () => {
    reset(null);
    renderWithPath("unknown-course", "modul-1");

    await waitFor(() =>
      expect(screen.getByText(/Kurset blev ikke fundet/i)).toBeInTheDocument()
    );
  });

  it("defaults to the first lesson when the URL has no lessonSlug", async () => {
    reset(COURSE);
    renderWithPath("begynder-guitar-fra-0-til-helt");

    // Title appears in two places (h1 + sidebar subtitle)
    await waitFor(() =>
      expect(screen.getAllByText("Modul 1: Introduktion").length).toBeGreaterThanOrEqual(1)
    );

    // First lesson's MuxPlayer should be rendered
    const player = screen.getByTestId("mux-player");
    expect(player).toHaveAttribute("data-playback-id", "abc123XYZ");
  });

  it("renders the 'no lessons yet' state when the course has zero lessons and no lessonSlug", async () => {
    reset({ ...COURSE, lessons: [] });
    renderWithPath("begynder-guitar-fra-0-til-helt");

    await waitFor(() =>
      expect(screen.getByText(/Lektioner kommer snart/i)).toBeInTheDocument()
    );
    expect(screen.queryByTestId("mux-player")).not.toBeInTheDocument();
  });
});
