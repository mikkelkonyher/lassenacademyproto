/**
 * Watchlist context — single source of truth for the logged-in user's saved
 * courses and lessons. Loads the watchlist once on auth and exposes
 * optimistic toggle helpers.
 *
 * Storage: a single `user_watchlist` table with `item_type` discriminating
 * course vs lesson, gated by RLS so users only ever read/write their own rows.
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

type WatchlistItemType = 'course' | 'lesson';

interface WatchlistContextType {
  /** True while the initial fetch for the current user is in flight */
  loading: boolean;
  /** Course IDs currently in the watchlist */
  courses: Set<string>;
  /** Lesson IDs currently in the watchlist */
  lessons: Set<string>;
  /** Cheap membership check used by buttons */
  isSaved: (type: WatchlistItemType, id: string) => boolean;
  /**
   * Optimistically add/remove a row. Updates state immediately, then writes
   * to Supabase. Reverts on error so the UI stays in sync with the DB.
   */
  toggle: (type: WatchlistItemType, id: string) => Promise<void>;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Set<string>>(new Set());
  const [lessons, setLessons] = useState<Set<string>>(new Set());
  // True until the first fetch for a given user completes
  const [loading, setLoading] = useState(false);

  // Fetch the user's full watchlist whenever the authenticated user changes.
  // Logged-out users get empty sets; logout clears state immediately.
  /* eslint-disable react-hooks/set-state-in-effect -- syncing state to auth state changes */
  useEffect(() => {
    if (!user) {
      setCourses(new Set());
      setLessons(new Set());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabase
      .from('user_watchlist')
      .select('item_type, course_id, lesson_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoading(false);
          return;
        }
        const c = new Set<string>();
        const l = new Set<string>();
        for (const row of data) {
          if (row.item_type === 'course' && row.course_id) c.add(row.course_id);
          if (row.item_type === 'lesson' && row.lesson_id) l.add(row.lesson_id);
        }
        setCourses(c);
        setLessons(l);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isSaved = useCallback(
    (type: WatchlistItemType, id: string) =>
      type === 'course' ? courses.has(id) : lessons.has(id),
    [courses, lessons],
  );

  const toggle = useCallback(
    async (type: WatchlistItemType, id: string) => {
      if (!user) return;
      const setter = type === 'course' ? setCourses : setLessons;
      const current = type === 'course' ? courses : lessons;
      const wasSaved = current.has(id);

      // Optimistic update — flip the local Set first for instant feedback
      setter((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(id);
        else next.add(id);
        return next;
      });

      const fkColumn = type === 'course' ? 'course_id' : 'lesson_id';
      const { error } = wasSaved
        ? await supabase
            .from('user_watchlist')
            .delete()
            .eq('user_id', user.id)
            .eq('item_type', type)
            .eq(fkColumn, id)
        : await supabase.from('user_watchlist').insert({
            user_id: user.id,
            item_type: type,
            [fkColumn]: id,
          });

      if (error) {
        // Revert: restore the previous membership state
        setter((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(id);
          else next.delete(id);
          return next;
        });
        console.error('[watchlist] toggle failed', error);
      }
    },
    [user, courses, lessons],
  );

  const value = useMemo<WatchlistContextType>(
    () => ({ loading, courses, lessons, isSaved, toggle }),
    [loading, courses, lessons, isSaved, toggle],
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
