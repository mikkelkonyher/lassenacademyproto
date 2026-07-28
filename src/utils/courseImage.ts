/**
 * Course thumbnail helper.
 *
 * Posters are served from Supabase Storage (`course-thumbnails` bucket) via
 * `courses.image_url` and `lessons.thumbnail_url`.
 *
 * Why not derive them from Mux? Because a `signed` playback ID refuses
 * unsigned image requests, and Mux requires thumbnail options (width/time) to
 * be claims inside the JWT rather than URL query parameters. The viewers who
 * see these posters — anonymous visitors on the catalogue, and non-owners
 * looking at the locked lessons in the LessonPlayer sidebar — are precisely
 * the ones who cannot hold a token. So the image.mux.com derivation below is
 * only a fallback for assets that are still `public`.
 */
import type { Database } from "../types/database.types";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

type LessonCoverInput = Pick<
  Lesson,
  "mux_playback_id" | "mux_playback_policy" | "thumbnail_url" | "sort_order"
>;
type CourseWithLessons = Pick<Course, "image_url"> & {
  lessons?: LessonCoverInput[] | null;
};

/**
 * Returns the first published lesson, ordered by sort_order (null treated
 * as 0). Used to borrow a poster for courses with no explicit image_url.
 */
function firstLesson(
  lessons: LessonCoverInput[] | null | undefined,
): LessonCoverInput | null {
  if (!lessons || lessons.length === 0) return null;
  const sorted = [...lessons].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return sorted[0] ?? null;
}

/**
 * Derives a poster URL straight from Mux. Only valid while the asset's
 * playback policy is still `public` — returns null for signed assets, which
 * would otherwise render as a broken image.
 */
function muxFallback(lesson: LessonCoverInput, width: number): string | null {
  if (!lesson.mux_playback_id) return null;
  if (lesson.mux_playback_policy === "signed") return null;
  return `https://image.mux.com/${lesson.mux_playback_id}/thumbnail.webp?width=${width}`;
}

export function getCourseThumbnail(course: CourseWithLessons): string {
  // Explicit image_url wins — an admin-chosen poster in Supabase Storage.
  if (course.image_url) return course.image_url;
  // Otherwise borrow the first lesson's stored poster.
  const lesson = firstLesson(course.lessons);
  if (!lesson) return "";
  if (lesson.thumbnail_url) return lesson.thumbnail_url;
  // Last resort, and only for assets that are still public.
  return muxFallback(lesson, 800) ?? "";
}

/**
 * Returns the thumbnail URL for a single lesson (used in the course
 * overview's lesson list). Returns null when the lesson has no poster and no
 * public Mux asset — the caller renders a placeholder.
 */
export function getLessonThumbnail(
  lesson: LessonCoverInput,
): string | null {
  if (lesson.thumbnail_url) return lesson.thumbnail_url;
  return muxFallback(lesson, 600);
}

/**
 * Sum all lesson durations to produce the course's total runtime.
 * Lessons with null duration_seconds are skipped.
 */
export function totalCourseDuration(
  lessons: Pick<Lesson, "duration_seconds">[] | null | undefined,
): number | null {
  if (!lessons || lessons.length === 0) return null;
  const total = lessons.reduce((acc, l) => acc + (l.duration_seconds ?? 0), 0);
  return total > 0 ? total : null;
}
