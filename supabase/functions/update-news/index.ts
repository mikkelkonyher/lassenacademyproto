// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: update-news
 *
 * Updates an existing news article. Only accessible to admin users.
 * Security: JWT auth, admin role check, input sanitization.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { reportError } from "../_shared/sentry.ts";

// Supabase connection via service role (bypasses RLS for admin operations)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://lassenacademyproto.vercel.app",
];

// Returns CORS headers scoped to the requesting origin (if allowed)
function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// Validation limits
const TITLE_MAX = 200;
const BODY_MAX = 10000;

/** Strips HTML tags to prevent XSS injection */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/** Returns a JSON error response with CORS headers */
function jsonError(message: string, code: string, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed", "METHOD_NOT_ALLOWED", 405, corsHeaders);
  }

  try {
    // --- Authentication: verify JWT token ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return jsonError("Missing authorization", "UNAUTHORIZED", 401, corsHeaders);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user)
      return jsonError("Unauthorized", "UNAUTHORIZED", 401, corsHeaders);

    // --- Admin role check ---
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return jsonError("Admin access required", "FORBIDDEN", 403, corsHeaders);
    }

    // --- Parse and validate input ---
    const body = await req.json();
    const { id } = body;

    if (typeof id !== "string") {
      return jsonError("Missing news article id", "INVALID_INPUT", 400, corsHeaders);
    }

    // Build the update object with only provided fields
    const updates: Record<string, unknown> = {};

    if (typeof body.title_da === "string") {
      updates.title_da = stripHtml(body.title_da).trim();
      if (updates.title_da.length < 1 || (updates.title_da as string).length > TITLE_MAX) {
        return jsonError(`Danish title must be 1-${TITLE_MAX} characters`, "TITLE_LENGTH", 400, corsHeaders);
      }
    }

    if (typeof body.title_en === "string") {
      updates.title_en = stripHtml(body.title_en).trim();
      if ((updates.title_en as string).length < 1 || (updates.title_en as string).length > TITLE_MAX) {
        return jsonError(`English title must be 1-${TITLE_MAX} characters`, "TITLE_LENGTH", 400, corsHeaders);
      }
    }

    if (typeof body.body_da === "string") {
      updates.body_da = stripHtml(body.body_da).trim();
      if ((updates.body_da as string).length < 1 || (updates.body_da as string).length > BODY_MAX) {
        return jsonError(`Danish body must be 1-${BODY_MAX} characters`, "BODY_LENGTH", 400, corsHeaders);
      }
    }

    if (typeof body.body_en === "string") {
      updates.body_en = stripHtml(body.body_en).trim();
      if ((updates.body_en as string).length < 1 || (updates.body_en as string).length > BODY_MAX) {
        return jsonError(`English body must be 1-${BODY_MAX} characters`, "BODY_LENGTH", 400, corsHeaders);
      }
    }

    if (body.image_url !== undefined) {
      updates.image_url = typeof body.image_url === "string" ? body.image_url.trim() || null : null;
    }

    if (typeof body.published === "boolean") {
      updates.published = body.published;
    }

    // Set updated_at timestamp
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length <= 1) {
      return jsonError("No fields to update", "INVALID_INPUT", 400, corsHeaders);
    }

    // --- Update the news article ---
    const { data: article, error: updateError } = await supabaseAdmin
      .from("news")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonError("Failed to update news", "UPDATE_FAILED", 500, corsHeaders);
    }

    return new Response(JSON.stringify({ success: true, article }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    await reportError("update-news", err); // report to Sentry (backend project)
    return jsonError("Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
