// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: delete-forum-post
 *
 * Deletes a forum post with server-side ownership verification.
 * Also deletes associated comments and notifications (via cascade or manual).
 * Security: JWT auth, ownership check, rate limiting.
 * Rate limit: max 10 deletions per hour per user.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { reportError } from "../_shared/sentry.ts";

// Supabase connection via service role (bypasses RLS for admin operations)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Allowed origins for CORS — restrict to known frontends only
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

// Rate limiting: max deletions allowed within the time window
const RATE_LIMIT_DELETES = 10;
const RATE_LIMIT_WINDOW_MIN = 60;

/** Returns a JSON error response with CORS headers */
function jsonError(message: string, code: string, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight request from browser
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed", "METHOD_NOT_ALLOWED", 405, corsHeaders);
  }

  try {
    // --- Authentication: verify JWT token from request header ---
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

    // --- Parse and validate input ---
    const body = await req.json();
    const { post_id } = body;

    if (!post_id || typeof post_id !== "string") {
      return jsonError("Missing post_id", "INVALID_INPUT", 400, corsHeaders);
    }

    // --- Ownership check: only the post author can delete ---
    const { data: existingPost, error: fetchError } = await supabaseAdmin
      .from("forum_posts")
      .select("user_id")
      .eq("id", post_id)
      .single();

    if (fetchError || !existingPost) {
      return jsonError("Post not found", "NOT_FOUND", 404, corsHeaders);
    }
    if (existingPost.user_id !== user.id) {
      return jsonError("You can only delete your own posts", "FORBIDDEN", 403, corsHeaders);
    }

    // --- Rate limiting: check how many deletions the user made recently ---
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    ).toISOString();
    const { count } = await supabaseAdmin
      .from("forum_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action_type", "delete_post")
      .gte("created_at", windowStart);

    if ((count ?? 0) >= RATE_LIMIT_DELETES) {
      return jsonError(
        "Too many deletions. Please wait before deleting again.",
        "RATE_LIMITED",
        429,
        corsHeaders,
      );
    }

    // --- Delete associated notifications first ---
    await supabaseAdmin
      .from("forum_notifications")
      .delete()
      .eq("post_id", post_id);

    // --- Delete associated comments ---
    await supabaseAdmin
      .from("forum_comments")
      .delete()
      .eq("post_id", post_id);

    // --- Delete the post ---
    const { error: deleteError } = await supabaseAdmin
      .from("forum_posts")
      .delete()
      .eq("id", post_id);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      return jsonError("Failed to delete post", "DELETE_FAILED", 500, corsHeaders);
    }

    // Log this action for rate limiting tracking
    await supabaseAdmin.from("forum_rate_limits").insert({
      user_id: user.id,
      action_type: "delete_post",
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    await reportError("delete-forum-post", err); // report to Sentry (backend project)
    return jsonError("Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
