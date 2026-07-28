import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useMuxToken } from "../src/hooks/useMuxToken";

// ── Supabase mock ────────────────────────────────────────────
// The hook only uses auth.getSession() — it sends the JWT when one exists so
// the edge function can run its ownership check, and stays anonymous otherwise.

const mockGetSession = vi.fn();

vi.mock("../src/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

// ── Fixtures ─────────────────────────────────────────────────

const SIGNED_LESSON = {
  id: "lesson-signed",
  mux_playback_id: "signedPlaybackId",
  mux_playback_policy: "signed",
};

const PUBLIC_LESSON = {
  id: "lesson-public",
  mux_playback_id: "publicPlaybackId",
  mux_playback_policy: "public",
};

const TOKENS = { playback: "jwt.playback.sig", storyboard: "jwt.storyboard.sig" };

/** Builds a get-mux-token success payload with an expiry `ttl` seconds out. */
function tokenResponse(ttl = 3600) {
  return {
    tokens: TOKENS,
    expires_at: Math.floor(Date.now() / 1000) + ttl,
    reason: "signed",
  };
}

function mockFetchOnce(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-anon-key");
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "user-jwt" } },
  });
  // expires_at is recomputed per call, not captured once: a refresh must get a
  // fresh expiry, exactly as the real endpoint returns. Pinning it would make
  // every refresh land already-expired and reschedule at the 10s floor.
  fetchSpy = vi.fn().mockImplementation(async () => ({
    ok: true,
    status: 200,
    json: async () => tokenResponse(),
  }));
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// ── Tests ────────────────────────────────────────────────────

describe("useMuxToken — cases that must never hit the network", () => {
  it("treats a public lesson as ready with no tokens and no request", async () => {
    const { result } = renderHook(() => useMuxToken(PUBLIC_LESSON, true));

    expect(result.current.status).toBe("ready");
    expect(result.current.tokens).toBeNull();
    // This is what keeps unmigrated lessons behaving exactly as before —
    // a request here would add latency to every public lesson.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stays idle when the gate is closed", async () => {
    const { result } = renderHook(() => useMuxToken(SIGNED_LESSON, false));

    expect(result.current.status).toBe("idle");
    expect(result.current.tokens).toBeNull();
    // A non-owner must not even ask; the locked panel is shown from the UI gate.
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stays idle when there is no lesson", () => {
    const { result } = renderHook(() => useMuxToken(null, true));

    expect(result.current.status).toBe("idle");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stays idle when the lesson has no video yet", () => {
    const { result } = renderHook(() =>
      useMuxToken({ ...SIGNED_LESSON, mux_playback_id: null }, true),
    );

    expect(result.current.status).toBe("idle");
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("useMuxToken — signed lessons", () => {
  it("fetches and returns both tokens for an owner", async () => {
    const { result } = renderHook(() => useMuxToken(SIGNED_LESSON, true));

    // Derived, not stored: the very first render already reports loading.
    expect(result.current.status).toBe("loading");

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.tokens).toEqual(TOKENS);
    expect(result.current.errorCode).toBeNull();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://test.supabase.co/functions/v1/get-mux-token");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ lesson_id: SIGNED_LESSON.id });
  });

  it("sends the session JWT so the ownership check can run", async () => {
    const { result } = renderHook(() => useMuxToken(SIGNED_LESSON, true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    const { headers } = fetchSpy.mock.calls[0][1];
    expect(headers.Authorization).toBe("Bearer user-jwt");
    expect(headers.apikey).toBe("test-anon-key");
  });

  it("omits Authorization when logged out, so previews still play", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useMuxToken(SIGNED_LESSON, true));
    await waitFor(() => expect(result.current.status).toBe("ready"));

    const { headers } = fetchSpy.mock.calls[0][1];
    expect(headers.Authorization).toBeUndefined();
  });
});

describe("useMuxToken — refusals and failures", () => {
  it("surfaces NOT_OWNED so the caller can show the paywall", async () => {
    fetchSpy = mockFetchOnce(403, {
      error: "You do not own this course",
      code: "NOT_OWNED",
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useMuxToken(SIGNED_LESSON, true));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorCode).toBe("NOT_OWNED");
    // Critically: no tokens leak out alongside the error.
    expect(result.current.tokens).toBeNull();
  });

  it("surfaces AUTH_REQUIRED for a signed-out viewer", async () => {
    fetchSpy = mockFetchOnce(401, {
      error: "Login required",
      code: "AUTH_REQUIRED",
    });
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useMuxToken(SIGNED_LESSON, true));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorCode).toBe("AUTH_REQUIRED");
  });

  it("falls back to UNKNOWN when the server sends no error code", async () => {
    fetchSpy = mockFetchOnce(500, { error: "boom" });
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useMuxToken(SIGNED_LESSON, true));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.errorCode).toBe("UNKNOWN");
  });

  it("reports NETWORK_ERROR when the request throws", async () => {
    fetchSpy = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchSpy);

    const { result } = renderHook(() => useMuxToken(SIGNED_LESSON, true));

    await waitFor(() => expect(result.current.status).toBe("error"));
    // Distinct from NOT_OWNED on purpose: the UI offers a reload here rather
    // than telling a paying customer to buy the course again.
    expect(result.current.errorCode).toBe("NETWORK_ERROR");
  });
});

describe("useMuxToken — lesson switching", () => {
  it("never reports another lesson's tokens while the new one loads", async () => {
    const { result, rerender } = renderHook(
      ({ lesson }) => useMuxToken(lesson, true),
      { initialProps: { lesson: SIGNED_LESSON } },
    );

    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current.tokens).toEqual(TOKENS);

    // Switching lessons must invalidate the previous result immediately —
    // handing stale tokens to MuxPlayer would request the wrong video.
    rerender({ lesson: { ...SIGNED_LESSON, id: "lesson-other" } });

    expect(result.current.status).toBe("loading");
    expect(result.current.tokens).toBeNull();
  });
});

describe("useMuxToken — refresh before expiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("re-fetches shortly before the token expires", async () => {
    const { result } = renderHook(() => useMuxToken(SIGNED_LESSON, true));

    await vi.waitFor(() => expect(result.current.status).toBe("ready"));
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Refresh is scheduled 60s before a 3600s expiry. Nothing before then.
    await vi.advanceTimersByTimeAsync(3500 * 1000);
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    // Crossing the margin triggers exactly one refresh — without it a viewer
    // watching a long lesson would lose the stream mid-playback.
    await vi.advanceTimersByTimeAsync(100 * 1000);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does not schedule a refresh for a public lesson", async () => {
    const { result } = renderHook(() => useMuxToken(PUBLIC_LESSON, true));

    expect(result.current.status).toBe("ready");
    await vi.advanceTimersByTimeAsync(4000 * 1000);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
