/**
 * useProgressTracker — wires MuxPlayer events to the WatchProgressContext.
 * Returns props to spread onto <MuxPlayer>: startTime, onTimeUpdate,
 * onPause, onEnded. Debounces saves to ~10 s during playback.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWatchProgress } from '../context/WatchProgressContext';

// Minimum interval between automatic saves during playback
const SAVE_INTERVAL_MS = 10_000;
// Fraction of duration that counts as "completed"
const COMPLETION_THRESHOLD = 0.9;

interface ProgressTrackerOptions {
  lessonId: string;
  courseId: string;
  /** Skip tracking for locked lessons or anonymous users */
  enabled: boolean;
}

interface ProgressTrackerResult {
  startTime: number;
  onTimeUpdate: (evt: Event) => void;
  onPause: (evt: Event) => void;
  onEnded: (evt: Event) => void;
}

// No-op handlers when tracking is disabled
const NOOP_RESULT: ProgressTrackerResult = {
  startTime: 0,
  onTimeUpdate: () => {},
  onPause: () => {},
  onEnded: () => {},
};

export function useProgressTracker({
  lessonId,
  courseId,
  enabled,
}: ProgressTrackerOptions): ProgressTrackerResult {
  const { user } = useAuth();
  const { saveProgress, getPosition, isCompleted } = useWatchProgress();

  // Refs to hold latest playback state without triggering re-renders
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const lastSaveRef = useRef(0);
  // Guard against stale saves when rapidly switching lessons
  const lessonIdRef = useRef(lessonId);
  lessonIdRef.current = lessonId;

  // Persist current position to Supabase
  const flush = useCallback(() => {
    if (!user || lessonIdRef.current !== lessonId) return;
    const pos = currentTimeRef.current;
    const dur = durationRef.current;
    if (dur <= 0) return;

    const completed = pos / dur >= COMPLETION_THRESHOLD;
    saveProgress({
      lessonId,
      courseId,
      positionSeconds: Math.floor(pos),
      durationSeconds: Math.floor(dur),
      completed,
      updatedAt: new Date().toISOString(),
    });
    lastSaveRef.current = Date.now();
  }, [user, lessonId, courseId, saveProgress]);

  // Save on tab hide so progress isn't lost when the user switches away
  useEffect(() => {
    if (!user || !enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && durationRef.current > 0) {
        flush();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, enabled, flush]);

  // Reset refs when switching lessons
  useEffect(() => {
    currentTimeRef.current = 0;
    durationRef.current = 0;
    lastSaveRef.current = 0;
  }, [lessonId]);

  const onTimeUpdate = useCallback(
    (evt: Event) => {
      const el = evt.target as HTMLMediaElement;
      currentTimeRef.current = el.currentTime;
      durationRef.current = el.duration || 0;

      // Save at most once per SAVE_INTERVAL_MS during playback
      if (Date.now() - lastSaveRef.current >= SAVE_INTERVAL_MS) {
        flush();
      }
    },
    [flush],
  );

  const onPause = useCallback(
    (_evt: Event) => {
      flush();
    },
    [flush],
  );

  const onEnded = useCallback(
    (_evt: Event) => {
      if (!user) return;
      const dur = durationRef.current;
      saveProgress({
        lessonId,
        courseId,
        positionSeconds: Math.floor(dur),
        durationSeconds: Math.floor(dur),
        completed: true,
        updatedAt: new Date().toISOString(),
      });
      lastSaveRef.current = Date.now();
    },
    [user, lessonId, courseId, saveProgress],
  );

  if (!user || !enabled) return NOOP_RESULT;

  // Resume position: if already completed, restart from beginning;
  // otherwise back up 2 s so the user has playback context
  const saved = getPosition(lessonId);
  const alreadyDone = isCompleted(lessonId);
  const startTime = alreadyDone ? 0 : Math.max(0, saved - 2);

  return { startTime, onTimeUpdate, onPause, onEnded };
}
