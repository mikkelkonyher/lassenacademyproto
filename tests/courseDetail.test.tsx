import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "../src/context/LanguageContext";
import { AuthProvider } from "../src/context/AuthContext";
import CourseDetail from "../src/pages/CourseDetail";

// ── Mock data ────────────────────────────────────────────────

const COURSE_WITH_VIDEO = {
  id: "course-1",
  slug: "begynder-guitar-fra-0-til-helt",
  title_da: "Begynder Guitar: Fra 0 til Helt",
  title_en: "Beginner Guitar: From 0 to Hero",
  level_da: "Begynder",
  level_en: "Beginner",
  description_da: "Lær guitar fra bunden.",
  description_en: "Learn guitar from scratch.",
  instructor: "Ludwig Hamilton-Wittendorff",
  image_url: "https://example.com/guitar.webp",
  tags: ["Guitar", "Beginner"],
  mux_playback_id: "abc123XYZ",
  mux_asset_id: "asset-xyz",
  mux_playback_policy: "public",
  duration_seconds: 16200, // 4h 30m
  aspect_ratio: "16:9",
  access_tier: "free",
  published: true,
  sort_order: 0,
  created_at: "2026-05-21T00:00:00Z",
  updated_at: "2026-05-21T00:00:00Z",
};

const COURSE_NO_VIDEO = {
  ...COURSE_WITH_VIDEO,
  id: "course-2",
  slug: "draft-course",
  mux_playback_id: null,
  mux_asset_id: null,
  duration_seconds: null,
  aspect_ratio: null,
};

// ── Mux player mock — avoid HLS / web component setup in jsdom ─

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

// Each test sets the row this mock should return for the current slug
let mockCourseRow: unknown = null;
let mockCourseError: unknown = null;

// Build a chain that satisfies: .select("*").eq("slug",x).eq("published",true).maybeSingle()
function buildCoursesChain() {
  const maybeSingleFn = vi.fn().mockImplementation(async () => ({
    data: mockCourseRow,
    error: mockCourseError,
  }));
  const eqPublishedFn = vi.fn().mockReturnValue({ maybeSingle: maybeSingleFn });
  const eqSlugFn = vi.fn().mockReturnValue({ eq: eqPublishedFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqSlugFn });
  return { selectFn, eqSlugFn, eqPublishedFn, maybeSingleFn };
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
      if (table === "courses") {
        return { select: coursesChain.selectFn };
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
  },
}));

// ── Helper wrapper ───────────────────────────────────────────

function renderWithSlug(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/courses/${slug}`]}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/courses/:slug" element={<CourseDetail />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

// Resets shared mocks before each test
function reset({ row, error = null }: { row: unknown; error?: unknown }) {
  vi.clearAllMocks();
  mockCourseRow = row;
  mockCourseError = error;
  coursesChain = buildCoursesChain();
}

// ── Tests ────────────────────────────────────────────────────

describe("CourseDetail page", () => {
  beforeEach(() => {
    muxPlayerSpy.mockClear();
  });

  it("renders MuxPlayer with the correct playback ID when video is available", async () => {
    reset({ row: COURSE_WITH_VIDEO });

    renderWithSlug("begynder-guitar-fra-0-til-helt");

    // Title appears
    await waitFor(() =>
      expect(screen.getByText("Begynder Guitar: Fra 0 til Helt")).toBeInTheDocument()
    );

    // Mux player gets rendered with the right playback ID
    const player = screen.getByTestId("mux-player");
    expect(player).toHaveAttribute("data-playback-id", "abc123XYZ");
    expect(muxPlayerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ playbackId: "abc123XYZ" })
    );

    // Instructor + duration appear in the right column
    expect(screen.getAllByText("Ludwig Hamilton-Wittendorff").length).toBeGreaterThan(0);
    expect(screen.getByText("4t 30m")).toBeInTheDocument();
  });

  it("renders the Coming Soon placeholder when mux_playback_id is null", async () => {
    reset({ row: COURSE_NO_VIDEO });

    renderWithSlug("draft-course");

    // Coming Soon copy appears; MuxPlayer is NOT rendered
    await waitFor(() => expect(screen.getByText(/Video kommer snart/i)).toBeInTheDocument());
    expect(screen.queryByTestId("mux-player")).not.toBeInTheDocument();
    expect(muxPlayerSpy).not.toHaveBeenCalled();
  });

  it("renders the not-found state when the slug returns no row", async () => {
    reset({ row: null });

    renderWithSlug("unknown-slug");

    await waitFor(() =>
      expect(screen.getByText(/Kurset blev ikke fundet/i)).toBeInTheDocument()
    );
    expect(screen.queryByTestId("mux-player")).not.toBeInTheDocument();
  });
});
