import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "../src/context/LanguageContext";
import { AuthProvider } from "../src/context/AuthContext";
import CourseOverview from "../src/pages/CourseOverview";

// ── Mock data ────────────────────────────────────────────────

const LESSON_1 = {
  id: "lesson-1",
  course_id: "course-1",
  slug: "modul-1",
  title_da: "Modul 1: Introduktion",
  title_en: "Module 1: Introduction",
  description_da: null,
  description_en: null,
  mux_playback_id: "abc123XYZ",
  mux_asset_id: "asset-xyz",
  mux_playback_policy: "public",
  duration_seconds: 156,
  aspect_ratio: "16:9",
  sort_order: 0,
  published: true,
  created_at: "2026-05-21T00:00:00Z",
  updated_at: "2026-05-21T00:00:00Z",
};

const LESSON_2 = {
  ...LESSON_1,
  id: "lesson-2",
  slug: "modul-2",
  title_da: "Modul 2: Akkorder",
  title_en: "Module 2: Chords",
  mux_playback_id: null,
  duration_seconds: null,
  sort_order: 1,
};

const COURSE_WITH_LESSONS = {
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
  access_tier: "free",
  published: true,
  sort_order: 0,
  created_at: "2026-05-21T00:00:00Z",
  updated_at: "2026-05-21T00:00:00Z",
  lessons: [LESSON_1, LESSON_2],
};

const COURSE_NO_LESSONS = { ...COURSE_WITH_LESSONS, lessons: [] };

// ── Supabase mock ────────────────────────────────────────────

const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});

let mockCourseRow: unknown = null;

// Build a chain that satisfies:
//   .select(...).eq("slug",x).eq("published",true).eq("lessons.published",true).maybeSingle()
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

function renderWithSlug(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/courses/${slug}`]}>
      <LanguageProvider>
        <AuthProvider>
          <Routes>
            <Route path="/courses/:slug" element={<CourseOverview />} />
          </Routes>
        </AuthProvider>
      </LanguageProvider>
    </MemoryRouter>
  );
}

function reset(row: unknown) {
  vi.clearAllMocks();
  mockCourseRow = row;
  coursesChain = buildCoursesChain();
}

// ── Tests ────────────────────────────────────────────────────

describe("CourseOverview page", () => {
  beforeEach(() => {
    reset(null);
  });

  it("renders course meta and a lesson list when lessons exist", async () => {
    reset(COURSE_WITH_LESSONS);

    renderWithSlug("begynder-guitar-fra-0-til-helt");

    await waitFor(() =>
      expect(screen.getByText("Begynder Guitar: Fra 0 til Helt")).toBeInTheDocument()
    );

    // Both lessons rendered — title is prefixed with the 1-based index, so match by regex
    expect(screen.getByText(/1:\s+Modul 1: Introduktion/)).toBeInTheDocument();
    expect(screen.getByText(/2:\s+Modul 2: Akkorder/)).toBeInTheDocument();

    // Lesson links point to /courses/:slug/:lessonSlug
    const modul1Link = screen.getAllByRole("link").find((a) =>
      a.getAttribute("href") === "/courses/begynder-guitar-fra-0-til-helt/modul-1"
    );
    expect(modul1Link).toBeTruthy();
  });

  it("renders the empty state when the course has no lessons", async () => {
    reset(COURSE_NO_LESSONS);

    renderWithSlug("begynder-guitar-fra-0-til-helt");

    await waitFor(() =>
      expect(screen.getByText(/Lektioner kommer snart/i)).toBeInTheDocument()
    );
  });

  it("renders the not-found state when the slug returns no row", async () => {
    reset(null);

    renderWithSlug("unknown-slug");

    await waitFor(() =>
      expect(screen.getByText(/Kurset blev ikke fundet/i)).toBeInTheDocument()
    );
  });
});
