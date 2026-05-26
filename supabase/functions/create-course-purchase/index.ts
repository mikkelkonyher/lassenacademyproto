// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: create-course-purchase
 *
 * Records a one-time purchase of a course for the calling user.
 *
 * Mode: currently MOCK — no real payment is taken. The verifyPayment() step is
 * a stub so we can swap in Stripe Checkout/PaymentIntent verification later
 * without touching this function's structure.
 *
 * Security: JWT auth + idempotent on (user_id, course_id) so a double-click
 * never creates duplicate rows. Service-role insert bypasses RLS (clients
 * cannot write to user_course_purchases directly).
 *
 * Rate limit: 10 purchase attempts per hour per user (defense against
 * abuse — covers genuine retries and obvious abuse alike).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Allowed origins for CORS — restrict to known frontends only
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://lassenacademyproto.vercel.app",
];

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

// Rate limiting bounds (uses the existing forum_rate_limits table)
const RATE_LIMIT_PURCHASES = 10;
const RATE_LIMIT_WINDOW_MIN = 60;

// 2026 launch promotion — 35% off for all of calendar year 2026 (UTC).
// Mirrors src/utils/coursePricing.ts so the price the customer sees on the
// pricing page is the price recorded on the purchase row.
const PROMO_DISCOUNT_PERCENT = 35;
const PROMO_START_UTC = Date.UTC(2026, 0, 1, 0, 0, 0);
const PROMO_END_UTC = Date.UTC(2027, 0, 1, 0, 0, 0);

function computeEffectivePriceDkk(basePrice: number, nowMs: number): number {
  const promoActive = nowMs >= PROMO_START_UTC && nowMs < PROMO_END_UTC;
  if (!promoActive) return basePrice;
  return Math.round(basePrice * (1 - PROMO_DISCOUNT_PERCENT / 100));
}

function jsonError(
  message: string,
  code: string,
  status: number,
  cors: Record<string, string>,
) {
  return new Response(JSON.stringify({ error: message, code }), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

/**
 * verifyPayment — stub that always succeeds in mock mode.
 *
 * When Stripe lands, this is the only place that needs to change:
 *   - The frontend will create a Stripe Checkout Session in a separate
 *     function and redirect the user to Stripe.
 *   - On success, Stripe will hit a `stripe-webhook` edge function (not this
 *     one) with `checkout.session.completed`. That webhook will call this
 *     same purchase-creation logic with a verified payment_intent id.
 *   - This function may also be retained as a "verify-then-record" path
 *     where the client passes a verified session_id.
 */
function verifyPayment(): { ok: true; provider: "mock"; reference: string } {
  return {
    ok: true,
    provider: "mock",
    reference: `mock_${crypto.randomUUID()}`,
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError(
      "Method not allowed",
      "METHOD_NOT_ALLOWED",
      405,
      corsHeaders,
    );
  }

  try {
    // --- Authentication ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return jsonError(
        "Missing authorization",
        "UNAUTHORIZED",
        401,
        corsHeaders,
      );

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user)
      return jsonError("Unauthorized", "UNAUTHORIZED", 401, corsHeaders);

    // --- Input parsing & validation ---
    const body = await req.json().catch(() => ({}));
    const courseId = typeof body.course_id === "string" ? body.course_id : "";

    // Basic UUID shape check — catches obvious bad input before hitting the DB
    if (!/^[0-9a-f-]{36}$/i.test(courseId)) {
      return jsonError("Invalid course_id", "INVALID_INPUT", 400, corsHeaders);
    }

    // --- Idempotency: if user already owns this course, return it ---
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("user_course_purchases")
      .select("*")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existingErr) {
      console.error("Existing-purchase lookup error:", existingErr);
      return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
    }

    if (existing) {
      return new Response(
        JSON.stringify({ purchase: existing, already_owned: true }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        },
      );
    }

    // --- Verify course exists, is published, and has a saleable price ---
    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("id, price_dkk, published")
      .eq("id", courseId)
      .maybeSingle();

    if (courseErr) {
      console.error("Course lookup error:", courseErr);
      return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
    }

    if (!course) {
      return jsonError("Course not found", "NOT_FOUND", 404, corsHeaders);
    }

    if (!course.published) {
      return jsonError(
        "Course is not available for purchase",
        "NOT_PUBLISHED",
        400,
        corsHeaders,
      );
    }

    if (!course.price_dkk || Number(course.price_dkk) <= 0) {
      return jsonError(
        "Course is not for sale",
        "NOT_FOR_SALE",
        400,
        corsHeaders,
      );
    }

    // --- Rate limiting ---
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000,
    ).toISOString();
    const { count, error: rlError } = await supabaseAdmin
      .from("forum_rate_limits")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action_type", "create_course_purchase")
      .gte("created_at", windowStart);

    if (rlError) {
      console.error("Rate limit check error:", rlError);
      return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
    }

    if ((count ?? 0) >= RATE_LIMIT_PURCHASES) {
      return jsonError(
        "Too many purchase attempts. Please wait before trying again.",
        "RATE_LIMITED",
        429,
        corsHeaders,
      );
    }

    // --- Payment verification (mock for now) ---
    const payment = verifyPayment();
    if (!payment.ok) {
      return jsonError(
        "Payment verification failed",
        "PAYMENT_FAILED",
        402,
        corsHeaders,
      );
    }

    // --- Record the purchase ---
    // Compute the effective (post-promo) price the customer is charged so the
    // recorded amount matches what the pricing page displayed at checkout time.
    const effectivePriceDkk = computeEffectivePriceDkk(
      Number(course.price_dkk),
      Date.now(),
    );

    const { data: purchase, error: insertErr } = await supabaseAdmin
      .from("user_course_purchases")
      .insert({
        user_id: user.id,
        course_id: courseId,
        price_paid_dkk: effectivePriceDkk,
        payment_provider: payment.provider,
        payment_reference: payment.reference,
      })
      .select("*")
      .single();

    if (insertErr) {
      // Unique constraint may fire if two requests race — fall back to fetching the existing row
      console.error("Purchase insert error:", insertErr);
      const { data: raceWinner } = await supabaseAdmin
        .from("user_course_purchases")
        .select("*")
        .eq("user_id", user.id)
        .eq("course_id", courseId)
        .maybeSingle();
      if (raceWinner) {
        return new Response(
          JSON.stringify({ purchase: raceWinner, already_owned: true }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          },
        );
      }
      return jsonError(
        "Failed to record purchase",
        "INSERT_FAILED",
        500,
        corsHeaders,
      );
    }

    // Log this attempt for rate limiting tracking
    await supabaseAdmin.from("forum_rate_limits").insert({
      user_id: user.id,
      action_type: "create_course_purchase",
    });

    return new Response(
      JSON.stringify({ purchase, already_owned: false }),
      {
        status: 201,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonError("Internal server error", "INTERNAL_ERROR", 500, corsHeaders);
  }
});
