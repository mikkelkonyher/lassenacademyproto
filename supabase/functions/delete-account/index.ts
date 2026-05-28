// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: delete-account
 *
 * Permanently deletes the authenticated user's account (GDPR right to erasure).
 * Re-verifies the user's password server-side before deleting, then removes the
 * avatar from Storage and deletes the auth user. All user-owned rows (profile,
 * forum posts/comments/notifications, purchases, progress, watchlist, rate
 * limits) are removed automatically via ON DELETE CASCADE rooted at auth.users.
 *
 * Security: JWT auth + server-side password re-verification (blocks deletion
 * from a hijacked or stale session).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Supabase connection — service role bypasses RLS for admin operations
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Anon key is used to re-verify the password via signInWithPassword
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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
    if (!user.email)
      return jsonError("Account has no email to verify", "INVALID_INPUT", 400, corsHeaders);

    // --- Parse and validate input ---
    const body = await req.json();
    const { password } = body;
    if (!password || typeof password !== "string") {
      return jsonError("Missing password", "INVALID_INPUT", 400, corsHeaders);
    }

    // --- Re-verify password server-side using a throwaway anon client ---
    // This prevents a hijacked/stale session from deleting the account without
    // knowing the current password.
    const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: verifyError } = await supabaseAnon.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (verifyError) {
      return jsonError("Password is incorrect", "INVALID_PASSWORD", 403, corsHeaders);
    }

    // --- Delete avatar file(s) from Storage (the only data not covered by FK cascades) ---
    // Avatars live at `avatars/{user.id}/avatar.{ext}`; list the folder and remove all.
    const { data: avatarFiles } = await supabaseAdmin.storage
      .from("avatars")
      .list(user.id);
    if (avatarFiles && avatarFiles.length > 0) {
      const paths = avatarFiles.map((f) => `${user.id}/${f.name}`);
      await supabaseAdmin.storage.from("avatars").remove(paths);
    }

    // --- Delete the auth user — cascades remove all user-owned rows ---
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error("Delete error:", deleteError);
      return jsonError("Failed to delete account", "DELETE_FAILED", 500, corsHeaders);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
