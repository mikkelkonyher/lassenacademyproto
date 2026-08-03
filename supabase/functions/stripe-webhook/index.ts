// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: stripe-webhook
 *
 * The ONLY place that grants course access for a Stripe payment. Verifies the
 * Stripe signature, then writes the `user_course_purchases` row.
 *
 * PUBLIC endpoint — must be deployed with JWT verification OFF
 * (`--no-verify-jwt`), like fetch-podcast-feed and send-contact-message.
 * Stripe calls it server-to-server and cannot present a Supabase JWT; the
 * signature check is what authenticates the request. No CORS headers: this is
 * never called from a browser.
 *
 * Timing note: Stripe delivers `checkout.session.completed` and waits for our
 * 2xx BEFORE redirecting the customer to success_url, giving up only after
 * ~10 seconds. So this handler must answer fast — do no slow work here. That is
 * exactly why the purchase emails below run inside `EdgeRuntime.waitUntil()`:
 * an SMTP handshake to Gmail costs 1-2 s and must not sit inside that budget.
 *
 * Secrets (Deno.env): STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET,
 * GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO_EMAIL (the last three via
 * _shared/email.ts), plus optional SITE_URL.
 * The webhook secret differs between `stripe listen` (local) and a
 * Dashboard-created endpoint (deployed) — mixing them up is the classic cause
 * of "No signatures found matching the expected signature".
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Stripe from "npm:stripe@^22";
import { reportError } from "../_shared/sentry.ts";
import { CONTACT_TO_EMAIL, sendMail } from "../_shared/email.ts";
import {
  buildPurchaseEmail,
  buildSaleNotification,
} from "../_shared/purchaseEmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;

// Stripe calls us server-to-server, so there is no Origin header to derive the
// site URL from the way create-checkout-session does. The env var exists so a
// local `stripe listen` run can point links at localhost; production is the
// fallback, so nothing has to be configured for the deployed function.
const SITE_URL = Deno.env.get("SITE_URL") ??
  "https://lassenacademyproto.vercel.app";

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2026-06-24.dahlia",
  httpClient: Stripe.createFetchHttpClient(),
});

// Signature verification must use Web Crypto on Deno. The synchronous
// `constructEvent` relies on Node's crypto module and throws in this runtime,
// so we pair `constructEventAsync` with the SubtleCrypto provider.
const cryptoProvider = Stripe.createSubtleCryptoProvider();

// Postgres unique-violation — expected whenever Stripe redelivers an event
const PG_UNIQUE_VIOLATION = "23505";

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** What was bought, carried out of fulfilPurchase so the emails can use it */
interface FulfilledPurchase {
  userId: string;
  courseId: string;
  pricePaidDkk: number;
  paymentIntentId: string;
}

/**
 * Records the purchase that a completed Checkout Session paid for.
 *
 * Idempotent: `user_course_purchases` has UNIQUE (user_id, course_id), so a
 * redelivered event hits the constraint and is treated as success rather than
 * an error. Returns false only for failures worth retrying.
 *
 * `purchase` is set only when a row was actually inserted (reason
 * "fulfilled"), which is what gates the welcome email against redeliveries.
 */
async function fulfilPurchase(
  supabaseAdmin: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
): Promise<{ ok: boolean; reason?: string; purchase?: FulfilledPurchase }> {
  const userId = session.metadata?.user_id;
  const courseId = session.metadata?.course_id;

  // Without metadata we cannot know who bought what. This is a bug in
  // create-checkout-session rather than a transient failure, so don't ask
  // Stripe to retry — surface it to Sentry instead.
  if (!userId || !courseId) {
    await reportError(
      "stripe-webhook",
      new Error("Checkout session missing user_id/course_id metadata"),
      { session_id: session.id },
    );
    return { ok: true, reason: "missing_metadata" };
  }

  // Record what Stripe actually charged (amount_total is in DKK øre) rather
  // than recomputing the price, so the row matches the real receipt.
  const pricePaidDkk = (session.amount_total ?? 0) / 100;

  // The PaymentIntent id is the stable reference for refunds and reconciliation
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id ?? session.id;

  const { error } = await supabaseAdmin.from("user_course_purchases").insert({
    user_id: userId,
    course_id: courseId,
    price_paid_dkk: pricePaidDkk,
    payment_provider: "stripe",
    payment_reference: paymentIntentId,
  });

  if (error) {
    // Already fulfilled (redelivery or a race) — nothing left to do
    if (error.code === PG_UNIQUE_VIOLATION) {
      return { ok: true, reason: "already_fulfilled" };
    }
    // Anything else is worth a retry from Stripe
    console.error("Purchase insert error:", error);
    return { ok: false, reason: error.message };
  }

  return {
    ok: true,
    reason: "fulfilled",
    purchase: { userId, courseId, pricePaidDkk, paymentIntentId },
  };
}

/**
 * Sends the customer's welcome email and the academy's sale notification.
 *
 * Runs as a background task AFTER we have answered Stripe (see the timing note
 * at the top of this file). Never throws: fulfillment has already succeeded and
 * the customer can see the course regardless, so a mail failure is a support
 * issue, not a payment failure — it goes to Sentry and nothing else.
 */
async function sendPurchaseEmails(
  supabaseAdmin: ReturnType<typeof createClient>,
  session: Stripe.Checkout.Session,
  purchase: FulfilledPurchase,
): Promise<void> {
  try {
    // Stripe's own record of who paid. customer_email is set explicitly from
    // the account email in create-checkout-session, so this is the account
    // that just received access.
    const buyerEmail = session.customer_details?.email ?? session.customer_email;
    if (!buyerEmail) {
      console.error(
        `No buyer email on session ${session.id}; skipping purchase emails`,
      );
      return;
    }

    // Course copy for the mail. Same select shape as create-checkout-session.
    const { data: course, error: courseErr } = await supabaseAdmin
      .from("courses")
      .select("slug, title_da, title_en")
      .eq("id", purchase.courseId)
      .maybeSingle();

    if (courseErr || !course) {
      throw new Error(
        `Course lookup failed for ${purchase.courseId}: ` +
          (courseErr?.message ?? "not found"),
      );
    }

    // Greeting name + language come from the user's own profile; the checkout
    // locale only reflects the language the app happened to be in at the time.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, preferred_language")
      .eq("id", purchase.userId)
      .maybeSingle();

    const locale = profile?.preferred_language === "en" ? "en" : "da";
    const emailInput = {
      fullName: profile?.full_name ?? null,
      courseTitle: locale === "en" ? course.title_en : course.title_da,
      courseUrl: `${SITE_URL}/courses/${course.slug}`,
      pricePaidDkk: purchase.pricePaidDkk,
      // "Now" rather than the session's creation time: for a delayed payment
      // method this event can land days later, and the date the customer cares
      // about is when the payment cleared and access was granted.
      purchasedAt: new Date(),
      paymentReference: purchase.paymentIntentId,
      locale,
    };

    // Customer first — sequential, so a failing internal notification can never
    // cost the customer their welcome mail.
    const welcome = buildPurchaseEmail(emailInput);
    await sendMail({
      to: buyerEmail,
      subject: welcome.subject,
      text: welcome.text,
      html: welcome.html,
      // Replies land in the academy inbox rather than on the raw Gmail account
      replyTo: CONTACT_TO_EMAIL,
    });

    const sale = buildSaleNotification({ ...emailInput, buyerEmail });
    await sendMail({
      to: CONTACT_TO_EMAIL,
      subject: sale.subject,
      text: sale.text,
      html: sale.html,
    });
  } catch (err) {
    console.error("Purchase email error:", err);
    await reportError("stripe-webhook", err, {
      stage: "purchase_email",
      session_id: session.id,
      user_id: purchase.userId,
      course_id: purchase.courseId,
    });
  }
}

/**
 * Runs a promise past the response without blocking it. `EdgeRuntime` exists in
 * Supabase's runtime but not necessarily when serving locally, so fall back to
 * fire-and-forget rather than crashing.
 */
function runBackground(promise: Promise<unknown>): void {
  if (typeof EdgeRuntime !== "undefined") {
    EdgeRuntime.waitUntil(promise);
  } else {
    void promise;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // The raw, unmodified body is required for signature verification — parsing
  // it first (or re-serializing) invalidates the signature.
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return json({ error: "Missing stripe-signature header" }, 400);
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    // Bad signature: reject without retry. Do not report to Sentry — an
    // exposed endpoint attracts unsigned probe traffic and would create noise.
    console.error("Webhook signature verification failed:", err);
    return json({ error: "Invalid signature" }, 400);
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    switch (event.type) {
      // The customer submitted the Checkout form. For instant methods (cards)
      // the payment is already settled; for delayed-notification methods it is
      // not, which is why we gate on payment_status instead of fulfilling
      // unconditionally. We do not restrict payment_method_types, so Stripe may
      // legitimately offer a delayed method here.
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_status !== "paid") {
          // Funds not cleared yet — wait for async_payment_succeeded
          console.log(
            `Session ${session.id} completed but unpaid ` +
              `(${session.payment_status}); deferring fulfillment`,
          );
          return json({ received: true, deferred: true }, 200);
        }
        const result = await fulfilPurchase(supabaseAdmin, session);
        if (!result.ok) return json({ error: result.reason }, 500);
        // `purchase` is set only on a fresh insert, so a Stripe redelivery
        // never sends a second welcome email.
        if (result.purchase) {
          runBackground(
            sendPurchaseEmails(supabaseAdmin, session, result.purchase),
          );
        }
        return json({ received: true, outcome: result.reason }, 200);
      }

      // A delayed-notification payment finally cleared — safe to grant access
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const result = await fulfilPurchase(supabaseAdmin, session);
        if (!result.ok) return json({ error: result.reason }, 500);
        if (result.purchase) {
          runBackground(
            sendPurchaseEmails(supabaseAdmin, session, result.purchase),
          );
        }
        return json({ received: true, outcome: result.reason }, 200);
      }

      // A delayed-notification payment failed — never grant access. Logged so
      // the failure is visible; customer follow-up is handled outside this fn.
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(
          `Async payment failed for session ${session.id} ` +
            `(user ${session.metadata?.user_id ?? "unknown"})`,
        );
        return json({ received: true, outcome: "payment_failed" }, 200);
      }

      // Acknowledge everything else so Stripe stops retrying it
      default:
        return json({ received: true, ignored: event.type }, 200);
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    await reportError("stripe-webhook", err, { event_type: event.type }); // Sentry (backend project)
    // 500 so Stripe retries — the event may still be fulfillable
    return json({ error: "Internal server error" }, 500);
  }
});
