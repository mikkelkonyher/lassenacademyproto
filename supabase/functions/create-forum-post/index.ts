// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: create-forum-post
 *
 * Creates a new forum post with server-side validation.
 * Security: JWT auth, input sanitization, spam detection, rate limiting.
 * Rate limit: max 5 posts per hour per user.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Supabase connection via service role (bypasses RLS for admin operations)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// CORS headers — required on ALL responses (including errors) to avoid browser blocking
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Allowed forum categories (must match database CHECK constraint)
const VALID_CATEGORIES = [
  "general",
  "guitar",
  "bass",
  "piano",
  "vocals",
  "theory",
];

// Validation limits for post title and body
const TITLE_MIN = 1;
const TITLE_MAX = 150;
const BODY_MIN = 1;
const BODY_MAX = 5000;

// Rate limiting: max posts allowed within the time window
const RATE_LIMIT_POSTS = 5;
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
  if (/(.)\\1{9,}/.test(text)) return true;

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
function jsonError(message: string, code: string, status: number) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight request from browser
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed", "METHOD_NOT_ALLOWED", 405);
  }

  try {
    // --- Authentication: verify JWT token from request header ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return jsonError("Missing authorization", "UNAUTHORIZED", 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user)
      return jsonError("Unauthorized", "UNAUTHORIZED", 401);

    // --- Parse and validate input ---
    const body = await req.json();
    let { title, body: postBody, category } = body;

    if (
      typeof title !== "string" ||
      typeof postBody !== "string" ||
      typeof category !== "string"
    ) {
      return jsonError("Invalid input types", "INVALID_INPUT", 400);
    }

    // Sanitize: strip HTML tags and trim whitespace
    title = stripHtml(title).trim();
    postBody = stripHtml(postBody).trim();
    category = category.trim().toLowerCase();

    // Validate title length
    if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
      return jsonError(
        `Title must be between ${TITLE_MIN} and ${TITLE_MAX} characters`,
        "TITLE_LENGTH",
        400,
      );
    }

    // Validate body length
    if (postBody.length < BODY_MIN || postBody.length > BODY_MAX) {
      return jsonError(
        `Post body must be between ${BODY_MIN} and ${BODY_MAX} characters`,
        "BODY_LENGTH",
        400,
      );
    }

    // Validate category against allowed list
    if (!VALID_CATEGORIES.includes(category)) {
      return jsonError("Invalid category", "INVALID_CATEGORY", 400);
    }

    // Check for spam content
    if (isSpammy(title) || isSpammy(postBody)) {
      return jsonError(
        "Content flagged as spam. Please revise.",
        "SPAM_DETECTED",
        400,
      );
    }

    // --- Rate limiting: check how many posts the user created recently ---
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    ).toISOString();
    const { count, error: rlError } = await supabaseAdmin
      .from("forum_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action_type", "create_post")
      .gte("created_at", windowStart);

    if (rlError) {
      console.error("Rate limit check error:", rlError);
      return jsonError("Internal error", "INTERNAL_ERROR", 500);
    }

    if ((count ?? 0) >= RATE_LIMIT_POSTS) {
      return jsonError(
        "Too many posts. Please wait before posting again.",
        "RATE_LIMITED",
        429,
      );
    }

    // --- Insert the new post into the database ---
    const { data: post, error: insertError } = await supabaseAdmin
      .from("forum_posts")
      .insert({ user_id: user.id, category, title, body: postBody })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonError("Failed to create post", "INSERT_FAILED", 500);
    }

    // Log this action for rate limiting tracking
    await supabaseAdmin.from("forum_rate_limits").insert({
      user_id: user.id,
      action_type: "create_post",
    });

    return new Response(JSON.stringify({ success: true, post_id: post.id }), {
      status: 201,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
});
