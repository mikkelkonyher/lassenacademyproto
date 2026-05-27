/**
 * WatchProgressContext — tracks per-lesson video watch progress for the
 * logged-in user. Loads all rows on auth, exposes lookup helpers and an
 * optimistic upsert for the player to call during playback.
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

// Shape stored per lesson in the local Map
export interface LessonProgress {
  lessonId: string;
  courseId: string;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
  updatedAt: string;
}

interface WatchProgressContextType {
  loading: boolean;
  /** All progress entries — used by the profile page's "Continue Watching" */
  progressEntries: LessonProgress[];
  /** Has the user completed this lesson? */
  isCompleted: (lessonId: string) => boolean;
  /** Saved playback position in seconds (0 if never watched) */
  getPosition: (lessonId: string) => number;
  /** Watch fraction 0–1 (0 if never watched) */
  getProgressFraction: (lessonId: string) => number;
  /** Number of completed lessons within a course */
  completedCountForCourse: (courseId: string) => number;
  /** Upsert progress — called by the player hook on timeupdate/pause/ended */
  saveProgress: (entry: LessonProgress) => Promise<void>;
}

const WatchProgressContext = createContext<WatchProgressContextType | undefined>(undefined);

export function WatchProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Map<string, LessonProgress>>(new Map());
  const [loading, setLoading] = useState(false);

  // Fetch all progress rows for the current user on login; clear on logout
  /* eslint-disable react-hooks/set-state-in-effect -- syncing state to auth */
  useEffect(() => {
    if (!user) {
      setProgress(new Map());
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabase
      .from('user_lesson_progress')
      .select('lesson_id, course_id, position_seconds, duration_seconds, completed, updated_at')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setLoading(false);
          return;
        }
        const map = new Map<string, LessonProgress>();
        for (const row of data) {
          map.set(row.lesson_id, {
            lessonId: row.lesson_id,
            courseId: row.course_id,
            positionSeconds: row.position_seconds,
            durationSeconds: row.duration_seconds,
            completed: row.completed,
            updatedAt: row.updated_at,
          });
        }
        setProgress(map);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const isCompleted = useCallback(
    (lessonId: string) => progress.get(lessonId)?.completed ?? false,
    [progress],
  );

  const getPosition = useCallback(
    (lessonId: string) => progress.get(lessonId)?.positionSeconds ?? 0,
    [progress],
  );

  const getProgressFraction = useCallback(
    (lessonId: string) => {
      const entry = progress.get(lessonId);
      if (!entry || entry.durationSeconds <= 0) return 0;
      if (entry.completed) return 1;
      return Math.min(entry.positionSeconds / entry.durationSeconds, 1);
    },
    [progress],
  );

  const progressEntries = useMemo(() => [...progress.values()], [progress]);

  const completedCountForCourse = useCallback(
    (courseId: string) => {
      let count = 0;
      for (const entry of progress.values()) {
        if (entry.courseId === courseId && entry.completed) count++;
      }
      return count;
    },
    [progress],
  );

  // Optimistic upsert — update local Map immediately, then persist to Supabase
  const saveProgress = useCallback(
    async (entry: LessonProgress) => {
      if (!user) return;

      // Preserve completion: once completed, never revert
      const existing = progress.get(entry.lessonId);
      const merged: LessonProgress = {
        ...entry,
        completed: entry.completed || (existing?.completed ?? false),
        updatedAt: new Date().toISOString(),
      };

      // Optimistic local update
      setProgress((prev) => {
        const next = new Map(prev);
        next.set(merged.lessonId, merged);
        return next;
      });

      const { error } = await supabase
        .from('user_lesson_progress')
        .upsert(
          {
            user_id: user.id,
            lesson_id: merged.lessonId,
            course_id: merged.courseId,
            position_seconds: merged.positionSeconds,
            duration_seconds: merged.durationSeconds,
            completed: merged.completed,
          },
          { onConflict: 'user_id,lesson_id' },
        );

      if (error) {
        // Revert to previous state on failure
        setProgress((prev) => {
          const next = new Map(prev);
          if (existing) next.set(merged.lessonId, existing);
          else next.delete(merged.lessonId);
          return next;
        });
        console.error('[watch-progress] save failed', error);
      }
    },
    [user, progress],
  );

  const value = useMemo<WatchProgressContextType>(
    () => ({ loading, progressEntries, isCompleted, getPosition, getProgressFraction, completedCountForCourse, saveProgress }),
    [loading, progressEntries, isCompleted, getPosition, getProgressFraction, completedCountForCourse, saveProgress],
  );

  return (
    <WatchProgressContext.Provider value={value}>
      {children}
    </WatchProgressContext.Provider>
  );
}

/** Convenience hook — throws if used outside WatchProgressProvider */
export function useWatchProgress() {
  const ctx = useContext(WatchProgressContext);
  if (ctx === undefined) {
    throw new Error('useWatchProgress must be used within a WatchProgressProvider');
  }
  return ctx;
}
