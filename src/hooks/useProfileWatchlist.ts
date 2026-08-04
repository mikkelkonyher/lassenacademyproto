/**
 * useProfileWatchlist — the user's saved courses for the profile grid.
 *
 * The fetched rows are filtered against the WatchlistContext Set so an
 * optimistic un-save from WatchlistButton makes the card disappear immediately,
 * without a second round trip.
 */
import { useState, useEffect } from "react";
import { supabase } from "../supabase/client";
import { useWatchlist } from "../context/WatchlistContext";
import type { WatchlistRow } from "../types/profile";
import type { User } from "@supabase/supabase-js";

export function useProfileWatchlist(user: User | null) {
  const { courses: watchlistCourses, loading: watchlistLoading } = useWatchlist();
  const [watchlistRows, setWatchlistRows] = useState<WatchlistRow[]>([]);

  // Fetch the user's saved courses with embedded course info. RLS limits the
  // result to this user's rows. Watchlist is courses-only now.
  /* eslint-disable react-hooks/set-state-in-effect -- syncing fetched data + clearing on logout */
  useEffect(() => {
    if (!user) {
      setWatchlistRows([]);
      return;
    }
    let cancelled = false;
    supabase
      .from("user_watchlist")
      .select(
        "id, created_at, courses(id, slug, title_da, title_en, image_url, instructor)"
      )
      .eq("item_type", "course")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (cancelled || !data) return;
        setWatchlistRows(data as unknown as WatchlistRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const visibleCourseRows = watchlistRows.filter(
    (r) => r.courses && watchlistCourses.has(r.courses.id)
  );
  const watchlistIsEmpty = !watchlistLoading && visibleCourseRows.length === 0;

  return { visibleCourseRows, watchlistIsEmpty };
}
