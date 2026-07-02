// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: update-profile
 *
 * Updates the authenticated user's own profile row.
 * Security model: this function forwards the caller's JWT to a client created
 * with the ANON key, so every query runs as the `authenticated` role and RLS
 * applies (defense in depth — a user can only update their own row). The `role`
 * column is intentionally NOT in the allow-list, so a user cannot escalate to
 * admin via this endpoint.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { reportError } from "../_shared/sentry.ts";

// Allowed origins for CORS — restrict to known frontends only (matches the
// forum/contact functions instead of a wildcard origin).
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://lassenacademyproto.vercel.app",
];

// Returns CORS headers scoped to the requesting origin (if allowed)
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

// Profile columns returned to the client after an update. `email` is deliberately
// excluded: the column's SELECT privilege is revoked from anon/authenticated to
// prevent PII harvesting, so a RETURNING that included it would fail with
// "permission denied for column email". The client reads the user's own email
// from the auth session instead.
const RETURN_COLUMNS =
  "id, full_name, bio, image_url, instrument, skill_level, " +
  "notify_email, notify_course_updates, notify_newsletter, " +
  "preferred_language, role, created_at, updated_at";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight request from browser
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication: require a JWT and validate it ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Anon key + forwarded JWT => queries run as `authenticated` (RLS applies)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Whitelist allowed fields to prevent injection of arbitrary columns
    // (notably `role`, so a user cannot grant themselves admin).
    const allowedFields = [
      "full_name",
      "bio",
      "image_url",
      "instrument",
      "skill_level",
      "notify_email",
      "notify_course_updates",
      "notify_newsletter",
      "preferred_language",
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return new Response(
        JSON.stringify({ error: "No valid fields to update" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate skill_level against allowed values
    if (
      updates.skill_level &&
      !["beginner", "intermediate", "advanced"].includes(
        updates.skill_level as string,
      )
    ) {
      return new Response(JSON.stringify({ error: "Invalid skill_level" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate preferred_language against allowed values
    if (
      updates.preferred_language &&
      !["da", "en"].includes(updates.preferred_language as string)
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid preferred_language" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Sanitize string fields (trim, limit length)
    for (const field of ["full_name", "bio", "image_url", "instrument"]) {
      if (typeof updates[field] === "string") {
        updates[field] = (updates[field] as string)
          .trim()
          .slice(0, field === "bio" ? 500 : 255);
      }
    }

    // Update the caller's own row. RETURN_COLUMNS omits `email` so the implicit
    // SELECT in RETURNING does not hit the revoked column.
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select(RETURN_COLUMNS)
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ profile: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    await reportError("update-profile", err); // report to Sentry (backend project)
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
