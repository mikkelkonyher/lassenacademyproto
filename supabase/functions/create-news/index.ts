// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: create-news
 *
 * Creates a new news article. Only accessible to admin users.
 * Security: JWT auth, admin role check, input sanitization.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    let { title_da, title_en, body_da, body_en, image_url, published } = body;

    if (
      typeof title_da !== "string" ||
      typeof title_en !== "string" ||
      typeof body_da !== "string" ||
      typeof body_en !== "string"
    ) {
      return jsonError("Invalid input types", "INVALID_INPUT", 400, corsHeaders);
    }

    // Sanitize inputs
    title_da = stripHtml(title_da).trim();
    title_en = stripHtml(title_en).trim();
    body_da = stripHtml(body_da).trim();
    body_en = stripHtml(body_en).trim();

    // Validate lengths
    if (title_da.length < 1 || title_da.length > TITLE_MAX) {
      return jsonError(`Danish title must be 1-${TITLE_MAX} characters`, "TITLE_LENGTH", 400, corsHeaders);
    }
    if (title_en.length < 1 || title_en.length > TITLE_MAX) {
      return jsonError(`English title must be 1-${TITLE_MAX} characters`, "TITLE_LENGTH", 400, corsHeaders);
    }
    if (body_da.length < 1 || body_da.length > BODY_MAX) {
      return jsonError(`Danish body must be 1-${BODY_MAX} characters`, "BODY_LENGTH", 400, corsHeaders);
    }
    if (body_en.length < 1 || body_en.length > BODY_MAX) {
      return jsonError(`English body must be 1-${BODY_MAX} characters`, "BODY_LENGTH", 400, corsHeaders);
    }

    // Sanitize optional image URL
    if (image_url !== null && image_url !== undefined) {
      if (typeof image_url !== "string") {
        return jsonError("Invalid image_url type", "INVALID_INPUT", 400, corsHeaders);
      }
      image_url = image_url.trim() || null;
    }

    // Default published to true if not provided
    if (typeof published !== "boolean") {
      published = true;
    }

    // --- Insert the new news article ---
    const { data: article, error: insertError } = await supabaseAdmin
      .from("news")
      .insert({
        author_id: user.id,
        title_da,
        title_en,
        body_da,
        body_en,
        image_url,
        published,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonError("Failed to create news", "INSERT_FAILED", 500, corsHeaders);
    }

    return new Response(JSON.stringify({ success: true, article }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
