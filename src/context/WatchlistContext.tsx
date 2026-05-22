/**
 * Watchlist context — single source of truth for the logged-in user's saved
 * courses. Loads on auth and exposes an optimistic toggle helper.
 *
 * Storage: `user_watchlist` rows with `item_type = 'course'`, gated by RLS so
 * users only ever read/write their own rows. (Lesson saves are not exposed —
 * users save the parent course instead.)
 */

/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './AuthContext';

interface WatchlistContextType {
  /** True while the initial fetch for the current user is in flight */
  loading: boolean;
  /** Course IDs currently in the watchlist */
  courses: Set<string>;
  /** Cheap membership check used by buttons */
  isSaved: (courseId: string) => boolean;
  /**
   * Optimistically add/remove a row. Updates state immediately, then writes
   * to Supabase. Reverts on error so the UI stays in sync with the DB.
   */
  toggle: (courseId: string) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Set<string>>(new Set());
  // True until the first fetch for a given user completes
  const [loading, setLoading] = useState(false);

  // Fetch the user's full watchlist whenever the authenticated user changes.
  // Logged-out users get an empty set; logout clears state immediately.
  /* eslint-disable react-hooks/set-state-in-effect -- syncing state to auth state changes */
  useEffect(() => {
    if (!user) {
      setCourses(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabase
      .from('user_watchlist')
      .select('item_type, course_id')
      .eq('user_id', user.id)
      .eq('item_type', 'course')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoading(false);
          return;
        }
        const c = new Set<string>();
        for (const row of data) {
          if (row.course_id) c.add(row.course_id);
        }
        setCourses(c);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isSaved = useCallback(
    (courseId: string) => courses.has(courseId),
    [courses],
  );

  const toggle = useCallback(
    async (courseId: string) => {
      if (!user) return;
      const wasSaved = courses.has(courseId);

      // Optimistic update — flip the local Set first for instant feedback
      setCourses((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(courseId);
        else next.add(courseId);
        return next;
      });

      const { error } = wasSaved
        ? await supabase
            .from('user_watchlist')
            .delete()
            .eq('user_id', user.id)
            .eq('item_type', 'course')
            .eq('course_id', courseId)
        : await supabase.from('user_watchlist').insert({
            user_id: user.id,
            item_type: 'course',
            course_id: courseId,
          });

      if (error) {
        // Revert: restore the previous membership state
        setCourses((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(courseId);
          else next.delete(courseId);
          return next;
        });
        console.error('[watchlist] toggle failed', error);
      }
    },
    [user, courses],
  );

  const value = useMemo<WatchlistContextType>(
    () => ({ loading, courses, isSaved, toggle }),
    [loading, courses, isSaved, toggle],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

/** Convenience hook — throws if used outside WatchlistProvider */
export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (ctx === undefined) {
    throw new Error('useWatchlist must be used within a WatchlistProvider');
  }
  return ctx;
}
