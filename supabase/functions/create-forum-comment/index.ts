// @ts-nocheck — Deno edge function, not compiled by project TypeScript
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const BODY_MIN = 1;
const BODY_MAX = 2000;
const RATE_LIMIT_COMMENTS = 15;
const RATE_LIMIT_WINDOW_MIN = 60;

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

function isSpammy(text: string): boolean {
  const lower = text.toLowerCase();
  if (text.length > 20) {
    const upperCount = (text.match(/[A-Z]/g) || []).length;
    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.7) return true;
  }
  if (/(.)\\1{9,}/.test(text)) return true;
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
  const urlCount = (text.match(/https?:\/\//g) || []).length;
  if (urlCount > 3) return true;
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

function jsonError(message: string, code: string, status: number) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed", "METHOD_NOT_ALLOWED", 405);
  }

  try {
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

    const reqBody = await req.json();
    let { post_id, body: commentBody } = reqBody;

    if (!post_id || typeof post_id !== "string") {
      return jsonError("Missing post_id", "INVALID_INPUT", 400);
    }
    if (typeof commentBody !== "string") {
      return jsonError("Invalid input type", "INVALID_INPUT", 400);
    }

    commentBody = stripHtml(commentBody).trim();

    if (commentBody.length < BODY_MIN || commentBody.length > BODY_MAX) {
      return jsonError(
        `Comment must be between ${BODY_MIN} and ${BODY_MAX} characters`,
        "BODY_LENGTH",
        400
      );
    }

    if (isSpammy(commentBody)) {
      return jsonError(
        "Content flagged as spam. Please revise.",
        "SPAM_DETECTED",
        400
      );
    }

    const { data: post, error: postError } = await supabaseAdmin
      .from("forum_posts")
      .select("id, user_id")
      .eq("id", post_id)
      .single();

    if (postError || !post) {
      return jsonError("Post not found", "NOT_FOUND", 404);
    }

    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000
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
        429
      );
    }

    const { data: comment, error: insertError } = await supabaseAdmin
      .from("forum_comments")
      .insert({ post_id, user_id: user.id, body: commentBody })
      .select("id")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return jsonError("Failed to create comment", "INSERT_FAILED", 500);
    }

    if (post.user_id !== user.id) {
      await supabaseAdmin.from("forum_notifications").insert({
        user_id: post.user_id,
        post_id: post_id,
        comment_id: comment.id,
        commenter_id: user.id,
        is_read: false,
      });
    }

    await supabaseAdmin.from("forum_rate_limits").insert({
      user_id: user.id,
      action_type: "create_comment",
    });

    return new Response(
      JSON.stringify({ success: true, comment_id: comment.id }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
});
