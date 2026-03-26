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
const RATE_LIMIT_UPDATES = 20;
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
    let { comment_id, body: commentBody } = reqBody;

    if (!comment_id || typeof comment_id !== "string") {
      return jsonError("Missing comment_id", "INVALID_INPUT", 400);
    }
    if (typeof commentBody !== "string") {
      return jsonError("Invalid input type", "INVALID_INPUT", 400);
    }

    const { data: existingComment, error: fetchError } = await supabaseAdmin
      .from("forum_comments")
      .select("user_id")
      .eq("id", comment_id)
      .single();

    if (fetchError || !existingComment) {
      return jsonError("Comment not found", "NOT_FOUND", 404);
    }
    if (existingComment.user_id !== user.id) {
      return jsonError(
        "You can only edit your own comments",
        "FORBIDDEN",
        403
      );
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

    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000
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
        429
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("forum_comments")
      .update({ body: commentBody })
      .eq("id", comment_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonError("Failed to update comment", "UPDATE_FAILED", 500);
    }

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
    return jsonError("Internal server error", "INTERNAL_ERROR", 500);
  }
});
