/**
 * Course thumbnail helper.
 *
 * Prefers the explicit `courses.image_url` — that lets an admin pick a
 * specific frame (e.g. `?time=39`) or use any external image. When
 * image_url is empty, falls back to auto-deriving the thumbnail from the
 * first published lesson's Mux poster.
 */
import type { Database } from "../types/database.types";

type Course = Database["public"]["Tables"]["courses"]["Row"];
type Lesson = Database["public"]["Tables"]["lessons"]["Row"];

type LessonCoverInput = Pick<Lesson, "mux_playback_id" | "sort_order">;
type CourseWithLessons = Pick<Course, "image_url"> & {
  lessons?: LessonCoverInput[] | null;
};

/**
 * Returns the playback ID of the first published lesson that has a Mux asset.
 * "First" = lowest sort_order, treating null as 0.
 */
function firstLessonPlaybackId(lessons: LessonCoverInput[] | null | undefined): string | null {
  if (!lessons || lessons.length === 0) return null;
  const sorted = [...lessons].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
  );
  return sorted.find((l) => l.mux_playback_id)?.mux_playback_id ?? null;
}

export function getCourseThumbnail(course: CourseWithLessons): string {
  // Explicit image_url wins — admin can pick a custom Mux frame
  // (e.g. `?time=39`) or use any external image.
  if (course.image_url) return course.image_url;
  // Fallback: auto-derive from the first published lesson's Mux poster.
  const playbackId = firstLessonPlaybackId(course.lessons);
  if (playbackId) {
    return `https://image.mux.com/${playbackId}/thumbnail.webp?width=800`;
  }
  return "";
}

/**
 * Returns the thumbnail URL for a single lesson (used in the course
 * overview's lesson list). Returns null when the lesson has no uploaded
 * video yet — caller can render a placeholder.
 */
export function getLessonThumbnail(
  lesson: Pick<Lesson, "mux_playback_id">,
): string | null {
  if (!lesson.mux_playback_id) return null;
  return `https://image.mux.com/${lesson.mux_playback_id}/thumbnail.webp?width=600`;
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
