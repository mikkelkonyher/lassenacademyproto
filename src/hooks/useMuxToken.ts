/**
 * useMuxToken — fetches short-lived Mux playback tokens for a signed lesson.
 *
 * Lessons whose Mux asset still uses the `public` playback policy need no
 * token, so this hook short-circuits without a network call at all. That keeps
 * today's behaviour byte-for-byte identical while lessons are migrated to
 * `signed` one at a time.
 *
 * Tokens are refreshed shortly before they expire so a viewer watching a long
 * lesson is never interrupted.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase/client";

/** Token pair returned by the `get-mux-token` edge function. */
export type MuxTokens = {
  playback: string;
  storyboard: string;
};

export type MuxTokenStatus = "idle" | "loading" | "ready" | "error";

export type UseMuxTokenResult = {
  /** Null when the lesson is public — pass nothing to MuxPlayer in that case. */
  tokens: MuxTokens | null;
  status: MuxTokenStatus;
  /** Error code from the edge function: AUTH_REQUIRED, NOT_OWNED, … */
  errorCode: string | null;
};

/** Refresh this many seconds before the token actually expires. */
const REFRESH_MARGIN_SECONDS = 60;
/** Never schedule a refresh tighter than this, however short the TTL. */
const MIN_REFRESH_DELAY_MS = 10_000;

/** Shape of the lesson fields this hook needs. */
type TokenLesson = {
  id: string;
  mux_playback_id: string | null;
  mux_playback_policy: string | null;
};

/**
 * The last completed fetch, tagged with the lesson it belongs to. Tagging lets
 * the hook derive "still loading" during render instead of writing state
 * synchronously from the effect, which would both re-render twice and trip
 * react-hooks/set-state-in-effect.
 */
type FetchState = {
  lessonId: string | null;
  tokens: MuxTokens | null;
  status: Extract<MuxTokenStatus, "ready" | "error">;
  errorCode: string | null;
};

const INITIAL_FETCH_STATE: FetchState = {
  lessonId: null,
  tokens: null,
  status: "ready",
  errorCode: null,
};

export function useMuxToken(
  lesson: TokenLesson | null,
  enabled: boolean,
): UseMuxTokenResult {
  const [fetchState, setFetchState] = useState<FetchState>(INITIAL_FETCH_STATE);

  // Pending refresh timer, cleared whenever the lesson changes or we unmount
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lessonId = lesson?.id ?? null;
  const isSigned = lesson?.mux_playback_policy === "signed";
  const hasAsset = Boolean(lesson?.mux_playback_id);
  // Only signed assets behind an open gate need a network round-trip.
  const needsToken = enabled && Boolean(lessonId) && hasAsset && isSigned;

  useEffect(() => {
    if (!needsToken || !lessonId) return;

    // Guards against a slow response landing after the user has already
    // navigated to another lesson.
    let cancelled = false;

    const clearRefresh = () => {
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
    };

    const fetchToken = async () => {
      try {
        // Auth is optional — free-preview lessons are signed for anyone. Send
        // the JWT when we have one so the ownership check can run.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        };
        if (session) headers.Authorization = `Bearer ${session.access_token}`;

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-mux-token`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ lesson_id: lessonId }),
          },
        );
        const body = await res.json();
        if (cancelled) return;

        if (!res.ok) {
          clearRefresh();
          setFetchState({
            lessonId,
            tokens: null,
            status: "error",
            errorCode: body?.code ?? "UNKNOWN",
          });
          return;
        }

        setFetchState({
          lessonId,
          tokens: body.tokens ?? null,
          status: "ready",
          errorCode: null,
        });

        // Schedule the next refresh just before expiry. Without this a viewer
        // watching past the TTL would lose the stream mid-lesson.
        if (body.tokens && typeof body.expires_at === "number") {
          const msUntilRefresh =
            (body.expires_at - REFRESH_MARGIN_SECONDS) * 1000 - Date.now();
          clearRefresh();
          refreshTimer.current = setTimeout(
            fetchToken,
            Math.max(msUntilRefresh, MIN_REFRESH_DELAY_MS),
          );
        }
      } catch {
        if (cancelled) return;
        // Network failure — surface as a generic error so the caller shows a
        // retryable message rather than the "you don't own this" panel.
        clearRefresh();
        setFetchState({
          lessonId,
          tokens: null,
          status: "error",
          errorCode: "NETWORK_ERROR",
        });
      }
    };

    fetchToken();

    return () => {
      cancelled = true;
      clearRefresh();
    };
  }, [needsToken, lessonId]);

  // Everything below is derived, not stored — see the FetchState comment.

  // Gate closed or no video: nothing to play, nothing to fetch.
  if (!enabled || !lessonId || !hasAsset) {
    return { tokens: null, status: "idle", errorCode: null };
  }
  // Public asset: ready immediately, with no tokens and no request.
  if (!isSigned) {
    return { tokens: null, status: "ready", errorCode: null };
  }
  // Signed asset whose fetch hasn't landed yet (including right after
  // switching lessons, when fetchState still describes the previous one).
  if (fetchState.lessonId !== lessonId) {
    return { tokens: null, status: "loading", errorCode: null };
  }
  return {
    tokens: fetchState.tokens,
    status: fetchState.status,
    errorCode: fetchState.errorCode,
  };
}
