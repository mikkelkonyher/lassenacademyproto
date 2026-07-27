// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: create-checkout-session
 *
 * Creates a Stripe Checkout Session for a one-time course purchase and returns
 * its hosted URL. The SPA redirects the browser to that URL; because we use
 * Stripe-hosted Checkout there is no Stripe.js and no publishable key in the
 * frontend at all.
 *
 * This function does NOT grant access. Fulfillment happens exclusively in the
 * `stripe-webhook` function, which is the only place that writes to
 * `user_course_purchases`. Never fulfil from the success redirect — the user
 * can close the tab, and some payment methods settle asynchronously.
 *
 * Security: JWT auth (deploy with verify_jwt ON). The price is computed
 * server-side from `courses.price_dkk` so a client can never dictate what it
 * pays. Rate limited to 10 session creations per hour per user.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^22";
import { reportError } from "../_shared/sentry.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

// Stripe client. `createFetchHttpClient` is required on Deno — the default
// Node HTTP client is unavailable in the edge runtime.
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
  httpClient: Stripe.createFetchHttpClient(),
});

// Tags every session so checkout flows can be compared in the Stripe Dashboard.
// Required from API version 2026-03-25.dahlia onwards; the 8-letter suffix is a
// fixed random label for THIS integration and should stay stable over time.
const INTEGRATION_IDENTIFIER = "lma_course_checkout_vqmxdrkp";

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

/**
 * Resolves the site base URL used for success/cancel redirects. Derived from
 * the request Origin when it is allow-listed so local dev returns to
 * localhost, otherwise falls back to production.
 */
function getSiteUrl(req: Request): string {
  const origin = req.headers.get("Origin") ?? "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[1];
}

// Rate limiting bounds (uses the existing forum_rate_limits table)
const RATE_LIMIT_SESSIONS = 10;
const RATE_LIMIT_WINDOW_MIN = 60;

// 2026 launch promotion — 35% off for all of calendar year 2026 (UTC).
// Mirrors src/utils/coursePricing.ts so the price the customer sees on the
// pricing page is the price Stripe actually charges.
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
    if (!authHeader) {
      return jsonError(
        "Missing authorization",
        "UNAUTHORIZED",
        401,
        corsHeaders,
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return jsonError("Unauthorized", "UNAUTHORIZED", 401, corsHeaders);
    }

    // --- Input parsing & validation ---
    const body = await req.json().catch(() => ({}));
    const courseId = typeof body.course_id === "string" ? body.course_id : "";
    // Checkout page language — mirrors the app's DA/EN toggle
    const locale = body.locale === "en" ? "en" : "da";

    // Basic UUID shape check — catches obvious bad input before hitting the DB
    if (!/^[0-9a-f-]{36}$/i.test(courseId)) {
      return jsonError("Invalid course_id", "INVALID_INPUT", 400, corsHeaders);
    }

    // --- Already owned? Don't let the user pay twice ---
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("user_course_purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existingErr) {
      console.error("Existing-purchase lookup error:", existingErr);
      return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
    }

    if (existing) {
      return jsonError(
        "You already own this course",
        "ALREADY_OWNED",
        409,
        corsHeaders,
      );
    }

    // --- Verify course exists, is published, and has a saleable price ---
    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("id, slug, title_da, title_en, price_dkk, published, image_url")
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
      .eq("action_type", "create_checkout_session")
      .gte("created_at", windowStart);

    if (rlError) {
      console.error("Rate limit check error:", rlError);
      return jsonError("Internal error", "INTERNAL_ERROR", 500, corsHeaders);
    }

    if ((count ?? 0) >= RATE_LIMIT_SESSIONS) {
      return jsonError(
        "Too many checkout attempts. Please wait before trying again.",
        "RATE_LIMITED",
        429,
        corsHeaders,
      );
    }

    // --- Create the Stripe Checkout Session ---
    const effectivePriceDkk = computeEffectivePriceDkk(
      Number(course.price_dkk),
      Date.now(),
    );
    const siteUrl = getSiteUrl(req);
    const title = locale === "en" ? course.title_en : course.title_da;

    // Price is passed inline rather than as a Stripe Price object so
    // `courses.price_dkk` + the promo logic above stay the single source of
    // truth. Note: `payment_method_types` is deliberately NOT set — omitting it
    // enables dynamic payment methods, letting Stripe surface whatever converts
    // best per customer (MobilePay, cards, …) configured from the Dashboard.
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale,
      customer_email: user.email,
      client_reference_id: user.id,
      integration_identifier: INTEGRATION_IDENTIFIER,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "dkk",
            // Stripe expects minor units — DKK øre
            unit_amount: Math.round(effectivePriceDkk * 100),
            product_data: {
              name: title,
              images: course.image_url ? [course.image_url] : undefined,
            },
          },
        },
      ],
      // The webhook reads these to decide who gets which course. Keeping the
      // identifiers here means the webhook never has to expand `line_items`.
      metadata: {
        user_id: user.id,
        course_id: course.id,
      },
      // Mirror onto the PaymentIntent so refunds/disputes carry the same context
      payment_intent_data: {
        metadata: {
          user_id: user.id,
          course_id: course.id,
        },
      },
      // {CHECKOUT_SESSION_ID} is substituted by Stripe, letting the return page
      // look the session up if the webhook hasn't landed yet.
      success_url:
        `${siteUrl}/courses/${course.slug}` +
        `?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/courses/${course.slug}?purchase=cancelled`,
    });

    // Log this attempt for rate limiting tracking. The error is inspected on
    // purpose: silently swallowing it is exactly how the rate limits on the
    // forum-delete and course-purchase functions ended up counting nothing for
    // months (their action_type values were rejected by a CHECK constraint).
    // A failure here shouldn't fail the request — the session is already
    // created — but it must be visible.
    const { error: rlInsertError } = await supabaseAdmin
      .from("forum_rate_limits")
      .insert({
        user_id: user.id,
        action_type: "create_checkout_session",
      });

    if (rlInsertError) {
      console.error("Rate limit log insert failed:", rlInsertError);
      await reportError("create-checkout-session", rlInsertError, {
        stage: "rate_limit_log",
      });
    }

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    await reportError("create-checkout-session", err); // report to Sentry (backend project)
    return jsonError(
      "Internal server error",
      "INTERNAL_ERROR",
      500,
      corsHeaders,
    );
  }
});
