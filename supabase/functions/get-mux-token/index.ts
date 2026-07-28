// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: get-mux-token
 *
 * Mints short-lived Mux playback JWTs for lessons whose Mux asset uses the
 * `signed` playback policy. This is the server-side half of the paywall: the
 * UI gate in LessonPlayer stops the interface, but only a missing token stops
 * the bytes.
 *
 * PUBLIC endpoint — must be deployed with JWT verification OFF
 * (`--no-verify-jwt`). Free-preview lessons have to play for logged-out
 * visitors, so authentication is optional and handled inside the function.
 *
 * Inputs:  { lesson_id: string }
 * Outputs: { tokens: { playback, storyboard } | null, expires_at, reason }
 *
 * We deliberately do NOT mint thumbnail (`aud: 't'`) tokens. Mux requires
 * thumbnail options (width/time/fit_mode) to be JWT claims rather than query
 * parameters, and the places that show posters — the anonymous catalogue and
 * the sidebar's locked lessons — belong to viewers who by definition cannot
 * hold a token. Posters therefore live in Supabase Storage instead; see
 * `courses.image_url` / `lessons.thumbnail_url`.
 *
 * Secrets (Deno.env): MUX_SIGNING_KEY_ID, MUX_SIGNING_KEY_PRIVATE.
 * The private key is a PEM (PKCS#8) and must never reach the browser.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { importPKCS8, SignJWT } from "npm:jose@5";
import { reportError } from "../_shared/sentry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const MUX_SIGNING_KEY_ID = Deno.env.get("MUX_SIGNING_KEY_ID")!;
const MUX_SIGNING_KEY_PRIVATE = Deno.env.get("MUX_SIGNING_KEY_PRIVATE")!;

// Token lifetime. Long enough that a viewer finishes a lesson without a
// refresh, short enough that a leaked token is worthless the same day.
// Drop to 60 temporarily when exercising the refresh path.
const TOKEN_TTL_SECONDS = 3600;

// Mux audience claims — 'v' covers video and subtitles, 's' the storyboard
// used for hover-scrub previews. See docs.mux.com/guides/secure-video-playback.
const AUD_VIDEO = "v";
const AUD_STORYBOARD = "s";

// Allowed origins for CORS — restrict to known frontends only
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://lassenacademyproto.vercel.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[1];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

function json(payload: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function jsonError(
  message: string,
  code: string,
  status: number,
  cors: Record<string, string>,
) {
  return json({ error: message, code }, status, cors);
}

// --- PKCS#1 → PKCS#8 conversion -------------------------------------------
// Mux issues RSA signing keys in PKCS#1 form (`BEGIN RSA PRIVATE KEY`), but
// `jose.importPKCS8` only accepts PKCS#8 (`BEGIN PRIVATE KEY`). The conversion
// is purely structural: wrap the PKCS#1 DER in a PrivateKeyInfo SEQUENCE
// carrying the rsaEncryption algorithm identifier. No key material changes.
// Verified byte-identical against `openssl pkcs8 -topk8 -nocrypt`.

/** DER encoding of AlgorithmIdentifier { OID 1.2.840.113549.1.1.1, NULL }. */
const RSA_ALGORITHM_ID = new Uint8Array([
  0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86,
  0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00,
]);
/** DER encoding of INTEGER 0 — the PrivateKeyInfo version field. */
const PKCS8_VERSION_0 = new Uint8Array([0x02, 0x01, 0x00]);

/** DER definite-length encoding: short form under 128, long form above. */
function derLength(len: number): Uint8Array {
  if (len < 0x80) return new Uint8Array([len]);
  const bytes: number[] = [];
  let n = len;
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

/** Wraps `content` in a DER TLV with the given tag. */
function derWrap(tag: number, content: Uint8Array): Uint8Array {
  const len = derLength(content.length);
  const out = new Uint8Array(1 + len.length + content.length);
  out[0] = tag;
  out.set(len, 1);
  out.set(content, 1 + len.length);
  return out;
}

function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Strips the PEM armour and returns the raw DER bytes. */
function pemBody(pem: string): Uint8Array {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function pkcs1ToPkcs8Pem(pkcs1Pem: string): string {
  const inner = concatBytes(
    PKCS8_VERSION_0,
    RSA_ALGORITHM_ID,
    derWrap(0x04, pemBody(pkcs1Pem)),
  );
  const b64 = btoa(String.fromCharCode(...derWrap(0x30, inner)));
  return `-----BEGIN PRIVATE KEY-----\n${
    b64.match(/.{1,64}/g)!.join("\n")
  }\n-----END PRIVATE KEY-----`;
}

/**
 * Normalises whatever form the signing key was stored in into a PKCS#8 PEM.
 *
 * Handles all three shapes Mux and the Supabase secrets UI can produce:
 * base64-encoded PEM (what Mux's API and copy button give you), literal "\n"
 * instead of real newlines, and PKCS#1 rather than PKCS#8.
 */
function normalisePrivateKey(raw: string): string {
  let value = raw.replace(/\\n/g, "\n").trim();

  // Mux hands the key out base64-encoded — decode when it isn't already PEM.
  if (!value.includes("-----BEGIN")) {
    try {
      value = atob(value).trim();
    } catch {
      throw new Error(
        "MUX_SIGNING_KEY_PRIVATE is neither a PEM nor valid base64",
      );
    }
  }

  if (value.includes("BEGIN PRIVATE KEY")) return value;
  if (value.includes("BEGIN RSA PRIVATE KEY")) return pkcs1ToPkcs8Pem(value);

  // Only the armour line is echoed — never the key material.
  throw new Error(
    `Unrecognised MUX_SIGNING_KEY_PRIVATE format: ${value.split("\n")[0]}`,
  );
}

/**
 * Imports the signing key once per isolate rather than per request —
 * `importPKCS8` is comparatively expensive and the key never changes.
 * Cached as a promise so concurrent requests share a single import.
 */
let signingKeyPromise: Promise<CryptoKey> | null = null;
function getSigningKey(): Promise<CryptoKey> {
  if (!signingKeyPromise) {
    signingKeyPromise = importPKCS8(
      normalisePrivateKey(MUX_SIGNING_KEY_PRIVATE),
      "RS256",
    ).catch((err) => {
      // Never cache a failed import: a corrected secret should take effect on
      // the next invocation instead of waiting for the isolate to recycle.
      signingKeyPromise = null;
      throw err;
    });
  }
  return signingKeyPromise;
}

/**
 * Signs one Mux playback token for a given audience.
 *
 * `sub` is the playback ID, `kid` identifies which signing key Mux should
 * verify against, and `exp` bounds the damage of a leaked token.
 */
async function signMuxToken(
  playbackId: string,
  audience: string,
  expiresAt: number,
): Promise<string> {
  const key = await getSigningKey();
  return await new SignJWT({})
    .setProtectedHeader({ alg: "RS256", kid: MUX_SIGNING_KEY_ID, typ: "JWT" })
    .setSubject(playbackId)
    .setAudience(audience)
    .setExpirationTime(expiresAt)
    .sign(key);
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError(
      "Method not allowed",
      "METHOD_NOT_ALLOWED",
      405,
      corsHeaders,
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lessonId = typeof body.lesson_id === "string" ? body.lesson_id : "";

    // Basic UUID shape check — catches obvious bad input before hitting the DB
    if (!/^[0-9a-f-]{36}$/i.test(lessonId)) {
      return jsonError("Invalid lesson_id", "INVALID_INPUT", 400, corsHeaders);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- Optional authentication ---
    // Anonymous is allowed: free-preview lessons must play without an account.
    // A bad or expired token is treated as anonymous rather than rejected, so
    // a stale session still gets to watch the preview.
    const authHeader = req.headers.get("Authorization");
    let user = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseAdmin.auth.getUser(token);
      user = data?.user ?? null;
    }

    // --- Resolve the lesson ---
    const { data: lesson, error: lessonErr } = await supabaseAdmin
      .from("lessons")
      .select(
        "id, course_id, published, is_free_preview, mux_playback_id, mux_playback_policy",
      )
      .eq("id", lessonId)
      .maybeSingle();

    if (lessonErr) {
      console.error("Lesson lookup error:", lessonErr);
      return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
    }

    if (!lesson || !lesson.published || !lesson.mux_playback_id) {
      return jsonError("Lesson not found", "NOT_FOUND", 404, corsHeaders);
    }

    // --- Transitional state: unsigned assets need no token ---
    // Lets us flip lessons from `public` to `signed` one at a time without
    // the frontend having to know which is which.
    if (lesson.mux_playback_policy !== "signed") {
      return json({ tokens: null, reason: "public" }, 200, corsHeaders);
    }

    // --- The gate ---
    // Preview lessons are free to everyone, so they skip the ownership check
    // entirely — signing unconditionally is the whole point of a preview.
    if (!lesson.is_free_preview) {
      if (!user) {
        return jsonError(
          "Login required to watch this lesson",
          "AUTH_REQUIRED",
          401,
          corsHeaders,
        );
      }

      const { data: purchase, error: purchaseErr } = await supabaseAdmin
        .from("user_course_purchases")
        .select("course_id")
        .eq("user_id", user.id)
        .eq("course_id", lesson.course_id)
        .maybeSingle();

      if (purchaseErr) {
        console.error("Purchase lookup error:", purchaseErr);
        return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
      }

      // The authoritative check. Unlike the UI gate this runs on every token
      // request, so revoking a purchase takes effect at the next refresh.
      if (!purchase) {
        return jsonError(
          "You do not own this course",
          "NOT_OWNED",
          403,
          corsHeaders,
        );
      }
    }

    // --- Sign ---
    // Both tokens share one expiry so the player refreshes them together.
    const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
    const [playback, storyboard] = await Promise.all([
      signMuxToken(lesson.mux_playback_id, AUD_VIDEO, expiresAt),
      signMuxToken(lesson.mux_playback_id, AUD_STORYBOARD, expiresAt),
    ]);

    return json(
      {
        tokens: { playback, storyboard },
        expires_at: expiresAt,
        reason: "signed",
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    await reportError("get-mux-token", err); // report to Sentry (backend project)
    return jsonError(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      corsHeaders,
    );
  }
});
