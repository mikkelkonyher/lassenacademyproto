/**
 * useForumPosts — loads forum posts (with nested comments and author profiles)
 * one page at a time.
 *
 * Pagination keeps the query bounded as the forum grows, so a visit never pulls
 * thousands of posts and their comments at once.
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabase/client";
import type { ForumPost } from "../types/forum";

// Number of posts fetched per page (keeps the forum query bounded as it grows)
const PAGE_SIZE = 20;

export type FetchMode = "first" | "more" | "reload";

export function useForumPosts(errorMessage: string) {
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination state: `page` is the highest page index currently loaded.
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false); // true when more pages remain
  const [loadingMore, setLoadingMore] = useState(false); // spinner for "Load more"

  // Fetch posts with nested comments and author profiles from Supabase, one page
  // at a time. Page argument is passed explicitly (not read from state) so this
  // callback stays stable and the mount effect doesn't loop on page changes.
  //   - "first":  load page 0 (initial load / refresh)
  //   - "more":   append the next page (Load more button)
  //   - "reload": refetch every page currently loaded (after a create/edit/delete,
  //               so the user keeps their place instead of snapping back to the top)
  // Comments are sorted oldest-first so each conversation reads chronologically.
  const fetchPosts = useCallback(
    async (mode: FetchMode, currentPage: number) => {
      if (mode === "more") setLoadingMore(true);

      // Compute the row range for this fetch based on the mode.
      let from: number;
      let to: number;
      let targetPage: number;
      if (mode === "more") {
        targetPage = currentPage + 1;
        from = targetPage * PAGE_SIZE;
        to = from + PAGE_SIZE - 1;
      } else if (mode === "reload") {
        targetPage = currentPage;
        from = 0;
        to = (currentPage + 1) * PAGE_SIZE - 1;
      } else {
        targetPage = 0;
        from = 0;
        to = PAGE_SIZE - 1;
      }

      const { data, error: fetchError } = await supabase
        .from("forum_posts")
        .select(
          "*, profiles(full_name, image_url), forum_comments(*, profiles(full_name, image_url))"
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (fetchError) {
        setError(errorMessage);
      } else {
        const sorted = (data as unknown as ForumPost[]).map((post) => ({
          ...post,
          forum_comments: [...post.forum_comments].sort(
            (a, b) =>
              new Date(a.created_at).getTime() -
              new Date(b.created_at).getTime()
          ),
        }));
        // Append for "more", replace for "first"/"reload".
        setPosts((prev) => (mode === "more" ? [...prev, ...sorted] : sorted));
        setPage(targetPage);
        // More pages remain only if this fetch filled the window it requested.
        const expected =
          mode === "reload" ? (currentPage + 1) * PAGE_SIZE : PAGE_SIZE;
        setHasMore(sorted.length === expected);
        setError("");
      }
      setLoading(false);
      setLoadingMore(false);
    },
    [errorMessage]
  );

  /* eslint-disable react-hooks/set-state-in-effect -- data fetching on mount is a valid effect pattern */
  useEffect(() => {
    fetchPosts("first", 0);
  }, [fetchPosts]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return {
    posts,
    loading,
    error,
    setError,
    page,
    hasMore,
    loadingMore,
    fetchPosts,
  };
}
