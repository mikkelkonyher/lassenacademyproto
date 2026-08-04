/**
 * useContinueWatching — resolves the single most recently watched in-progress
 * lesson into a card-ready row, joining in its parent course.
 */
import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { useWatchProgress } from "../context/WatchProgressContext";
import type { ContinueWatchingRow } from "../types/profile";
import type { User } from "@supabase/supabase-js";

export function useContinueWatching(user: User | null) {
  const { progressEntries } = useWatchProgress();
  const [continueRow, setContinueRow] = useState<ContinueWatchingRow | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- syncing derived data */
  useEffect(() => {
    // Pick the most recent non-completed entry
    const candidate = progressEntries
      .filter((e) => !e.completed && e.positionSeconds > 0)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!user || !candidate) {
      setContinueRow(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("lessons")
      .select(
        "id, slug, title_da, title_en, sort_order, thumbnail_url, courses(slug, title_da, title_en, image_url)"
      )
      .eq("id", candidate.lessonId)
      .maybeSingle()
      .then(({ data: lesson }) => {
        if (cancelled || !lesson) return;
        const c = (lesson as unknown as {
          courses: {
            slug: string;
            title_da: string;
            title_en: string;
            image_url: string;
          };
        }).courses;
        if (!c) return;
        setContinueRow({
          lessonId: candidate.lessonId,
          lessonSlug: lesson.slug,
          titleDa: lesson.title_da,
          titleEn: lesson.title_en,
          courseSlug: c.slug,
          courseTitleDa: c.title_da,
          courseTitleEn: c.title_en,
          courseImageUrl: c.image_url,
          sortOrder: lesson.sort_order ?? 0,
          positionSeconds: candidate.positionSeconds,
          durationSeconds: candidate.durationSeconds,
          completed: candidate.completed,
          lessonThumbnailUrl: lesson.thumbnail_url,
        });
      });
    return () => {
      cancelled = true;
    };
  }, [user, progressEntries]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return continueRow;
}
