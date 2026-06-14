// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: update-forum-comment
 *
 * Updates an existing forum comment with server-side validation.
 * Security: JWT auth, ownership verification, input sanitization,
 * spam detection, rate limiting.
 * Rate limit: max 20 edits per hour per user.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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

// Rate limiting: max edits allowed within the time window
const RATE_LIMIT_UPDATES = 20;
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
    let { comment_id, body: commentBody } = reqBody;

    if (!comment_id || typeof comment_id !== "string") {
      return jsonError("Missing comment_id", "INVALID_INPUT", 400, corsHeaders);
    }
    if (typeof commentBody !== "string") {
      return jsonError("Invalid input type", "INVALID_INPUT", 400, corsHeaders);
    }

    // --- Ownership check: only the comment author can edit ---
    const { data: existingComment, error: fetchError } = await supabaseAdmin
      .from("forum_comments")
      .select("user_id")
      .eq("id", comment_id)
      .single();

    if (fetchError || !existingComment) {
      return jsonError("Comment not found", "NOT_FOUND", 404, corsHeaders);
    }
    if (existingComment.user_id !== user.id) {
      return jsonError(
        "You can only edit your own comments",
        "FORBIDDEN",
        403,
        corsHeaders,
      );
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

    // --- Rate limiting: check how many edits the user made recently ---
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    ).toISOString();
    const { count } = await supabaseAdmin
      .from("forum_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action_type", "update_comment")
      .gte("created_at", windowStart);

    if ((count ?? 0) >= RATE_LIMIT_UPDATES) {
      return jsonError(
        "Too many edits. Please wait before editing again.",
        "RATE_LIMITED",
        429,
        corsHeaders,
      );
    }

    // --- Update the comment in the database ---
    const { error: updateError } = await supabaseAdmin
      .from("forum_comments")
      .update({ body: commentBody })
      .eq("id", comment_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonError("Failed to update comment", "UPDATE_FAILED", 500, corsHeaders);
    }

    // Log this action for rate limiting tracking
    await supabaseAdmin.from("forum_rate_limits").insert({
      user_id: user.id,
      action_type: "update_comment",
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
