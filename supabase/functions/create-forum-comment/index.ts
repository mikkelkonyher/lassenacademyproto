// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: create-forum-comment
 *
 * Creates a new comment on a forum post with server-side validation.
 * Also creates a notification for the post author (if commenter is not the author).
 * Security: JWT auth, input sanitization, spam detection, rate limiting.
 * Rate limit: max 15 comments per hour per user.
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

// Validation limits for comment body
const BODY_MIN = 1;
const BODY_MAX = 2000;

// Rate limiting: max comments allowed within the time window
const RATE_LIMIT_COMMENTS = 15;
const RATE_LIMIT_WINDOW_MIN = 60;

/** Strips HTML tags to prevent XSS injection */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/**
 * Detects spam patterns in user-submitted text.
 * Checks for: excessive caps, repeated characters, known spam phrases,
 * too many URLs, and repeated words.
 */
function isSpammy(text: string): boolean {
  const lower = text.toLowerCase();

  // Flag if more than 70% uppercase (only for text longer than 20 chars)
  if (text.length > 20) {
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.7) return true;
  }

  // Flag repeated characters like "aaaaaaaaa"
  if (/(.)\1{9,}/.test(text)) return true;

  // Flag common spam phrases
  const spamPhrases = [
    "buy now",
    "click here",
    "free money",
    "act now",
    "limited time",
    "congratulations you won",
    "earn money fast",
    "make money online",
    "work from home",
    "double your",
    "casino",
    "viagra",
    "crypto airdrop",
    "send btc",
  ];
  if (spamPhrases.some((phrase) => lower.includes(phrase))) return true;

  // Flag excessive URLs (more than 3)
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) return true;

  // Flag if a single word is repeated excessively
  const words = lower.split(/\s+/);
  if (words.length > 5) {
    const wordCounts: Record<string, number> = {};
    for (const w of words) {
      wordCounts[w] = (wordCounts[w] || 0) + 1;
      if (wordCounts[w] > Math.max(5, words.length * 0.5)) return true;
    }
  }

  return false;
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
    const reqBody = await req.json();
    let { post_id, body: commentBody } = reqBody;

    if (!post_id || typeof post_id !== "string") {
      return jsonError("Missing post_id", "INVALID_INPUT", 400, corsHeaders);
    }
    if (typeof commentBody !== "string") {
      return jsonError("Invalid input type", "INVALID_INPUT", 400, corsHeaders);
    }

    // Sanitize: strip HTML tags and trim whitespace
    commentBody = stripHtml(commentBody).trim();

    // Validate comment length
    if (commentBody.length < BODY_MIN || commentBody.length > BODY_MAX) {
      return jsonError(
        `Comment must be between ${BODY_MIN} and ${BODY_MAX} characters`,
        "BODY_LENGTH",
        400,
        corsHeaders,
      );
    }

    // Check for spam content
    if (isSpammy(commentBody)) {
      return jsonError(
        "Content flagged as spam. Please revise.",
        "SPAM_DETECTED",
        400,
        corsHeaders,
      );
    }

    // --- Verify the target post exists and get its author ---
    const { data: post, error: postError } = await supabaseAdmin
      .from("forum_posts")
      .select("id, user_id")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return jsonError("Post not found", "NOT_FOUND", 404, corsHeaders);
    }

    // --- Rate limiting: check how many comments the user posted recently ---
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    ).toISOString();
    const { count } = await supabaseAdmin
      .from("forum_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action_type", "create_comment")
      .gte("created_at", windowStart);

    if ((count ?? 0) >= RATE_LIMIT_COMMENTS) {
      return jsonError(
        "Too many comments. Please wait before commenting again.",
        "RATE_LIMITED",
        429,
        corsHeaders,
      );
    }

    // --- Insert the new comment into the database ---
    const { data: comment, error: insertError } = await supabaseAdmin
      .from("forum_comments")
      .insert({ post_id, user_id: user.id, body: commentBody })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonError("Failed to create comment", "INSERT_FAILED", 500, corsHeaders);
    }

    // Notify the post author (skip if the commenter IS the author)
    if (post.user_id !== user.id) {
      await supabaseAdmin.from("forum_notifications").insert({
        user_id: post.user_id,
        post_id: post_id,
        comment_id: comment.id,
        commenter_id: user.id,
        is_read: false,
      });
    }

    // Log this action for rate limiting tracking
    await supabaseAdmin.from("forum_rate_limits").insert({
      user_id: user.id,
      action_type: "create_comment",
    });

    return new Response(
      JSON.stringify({ success: true, comment_id: comment.id }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    await reportError("create-forum-comment", err); // report to Sentry (backend project)
    return jsonError("Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
