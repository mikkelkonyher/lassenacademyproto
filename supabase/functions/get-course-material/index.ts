// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: get-course-material
 *
 * Hands out a short-lived signed URL for a course's PDF material (chord charts,
 * notes) to viewers who actually bought the course. This is the server-side half
 * of the paywall for downloadable material, mirroring `get-mux-token` for video:
 * the UI in LessonPlayer only decides whether to render the button, but only a
 * missing signature stops the bytes.
 *
 * The `course-materials` bucket is PRIVATE — the only private bucket in the
 * project. Every other bucket is public and read through
 * /storage/v1/object/public/..., which bypasses RLS entirely; that is fine for
 * avatars and posters but would hand paid material to anyone with the URL.
 *
 * JWT REQUIRED — deploy with verification ON (the default; no config.toml
 * entry). Unlike free-preview video there is no anonymous case to support.
 *
 * Inputs:  { course_id: string }
 * Outputs: { url: string, filename: string, expires_at: number }
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { reportError } from "../_shared/sentry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

/** Private bucket holding the course PDFs. */
const MATERIALS_BUCKET = "course-materials";

// Signed-URL lifetime. The link is followed immediately by the browser, so this
// only has to survive the round-trip — short enough that a copied URL pasted
// elsewhere is dead on arrival.
const SIGNED_URL_TTL_SECONDS = 120;

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
    const courseId = typeof body.course_id === "string" ? body.course_id : "";

    // Basic UUID shape check — catches obvious bad input before hitting the DB
    if (!/^[0-9a-f-]{36}$/i.test(courseId)) {
      return jsonError("Invalid course_id", "INVALID_INPUT", 400, corsHeaders);
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- Authentication (mandatory) ---
    // Nobody may download paid material anonymously, so an absent or invalid
    // token is rejected outright rather than downgraded to anonymous.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonError(
        "Login required to download course material",
        "AUTH_REQUIRED",
        401,
        corsHeaders,
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth
      .getUser(token);
    const user = authData?.user ?? null;

    if (authError || !user) {
      return jsonError("Unauthorized", "AUTH_REQUIRED", 401, corsHeaders);
    }

    // --- Resolve the course ---
    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("id, slug, published, pdf_path")
      .eq("id", courseId)
      .maybeSingle();

    if (courseErr) {
      console.error("Course lookup error:", courseErr);
      return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
    }

    // An unpublished course or one without material is indistinguishable from a
    // missing one — no reason to tell a caller which of the three it hit.
    if (!course || !course.published || !course.pdf_path) {
      return jsonError(
        "Course material not found",
        "NOT_FOUND",
        404,
        corsHeaders,
      );
    }

    // --- The gate ---
    // The authoritative ownership check. Unlike the button in LessonPlayer this
    // runs on every download, so revoking a purchase takes effect immediately.
    const { data: purchase, error: purchaseErr } = await supabaseAdmin
      .from("user_course_purchases")
      .select("course_id")
      .eq("user_id", user.id)
      .eq("course_id", course.id)
      .maybeSingle();

    if (purchaseErr) {
      console.error("Purchase lookup error:", purchaseErr);
      return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
    }

    if (!purchase) {
      return jsonError(
        "You do not own this course",
        "NOT_OWNED",
        403,
        corsHeaders,
      );
    }

    // --- Sign ---
    // `download` sets Content-Disposition: attachment, so the browser saves the
    // file instead of rendering it, and names it after the course rather than
    // exposing the internal storage path.
    const filename = `${course.slug}.pdf`;
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(MATERIALS_BUCKET)
      .createSignedUrl(course.pdf_path, SIGNED_URL_TTL_SECONDS, {
        download: filename,
      });

    if (signErr || !signed?.signedUrl) {
      // Most likely the row points at a path that was never uploaded.
      console.error("Signed URL error:", signErr);
      await reportError("get-course-material", signErr ?? new Error("No signed URL"), {
        course_id: course.id,
        pdf_path: course.pdf_path,
      });
      return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
    }

    return json(
      {
        url: signed.signedUrl,
        filename,
        expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS,
      },
      200,
      corsHeaders,
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    await reportError("get-course-material", err); // report to Sentry (backend project)
    return jsonError(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      corsHeaders,
    );
  }
});
