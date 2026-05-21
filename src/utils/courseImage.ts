/**
 * Course thumbnail helper.
 *
 * Mux auto-generates a poster image for every uploaded asset. Prefer that
 * over the manually-supplied image_url so courses don't need a separate
 * thumbnail upload. Falls back to image_url when no video has been uploaded
 * yet (mux_playback_id is null).
 */
import type { Database } from "../types/database.types";

type Course = Database["public"]["Tables"]["courses"]["Row"];

export function getCourseThumbnail(
  course: Pick<Course, "mux_playback_id" | "image_url">,
): string {
  if (course.mux_playback_id) {
    // width=800 keeps file size reasonable while supporting retina cards
    return `https://image.mux.com/${course.mux_playback_id}/thumbnail.webp?width=800`;
  }
  return course.image_url;
}
