// @ts-nocheck — Deno edge function, not compiled by project TypeScript
/**
 * Edge Function: send-contact-message
 *
 * Relays a public contact-form submission to the academy inbox over Gmail SMTP.
 * PUBLIC endpoint (no JWT) — must be deployed with JWT verification OFF, like
 * fetch-podcast-feed. Abuse protection: a hidden honeypot field, spam-pattern
 * detection, and a best-effort in-memory per-IP throttle.
 *
 * Email is sent by reusing the existing Gmail account (the same one configured
 * in Supabase Auth → SMTP). Edge Functions can't read the Auth SMTP secret, so
 * the Gmail app password is supplied separately as an Edge Function secret.
 *
 * Secrets (Deno.env): GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO_EMAIL.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Gmail SMTP credentials + destination inbox, supplied as Edge Function secrets
const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")!;
// Where contact messages are delivered (defaults to the public info address)
const CONTACT_TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL") ?? "info@lassenmusik.com";

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

// Field length limits
const NAME_MIN = 1;
const NAME_MAX = 100;
const SUBJECT_MIN = 1;
const SUBJECT_MAX = 150;
const MESSAGE_MIN = 1;
const MESSAGE_MAX = 5000;

// Best-effort rate limit: max submissions per IP within the window.
// In-memory only (per warm instance) — a hard limit would need a DB table.
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const ipHits = new Map<string, number[]>();

/** Strips HTML tags to prevent injection into the email body */
function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

/** Basic email shape check — not exhaustive, just rejects obvious garbage */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Escapes HTML special chars so user text can't break the email markup */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/** Returns true if this IP has exceeded the in-memory rate limit */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ipHits.get(ip) ?? []).filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS,
  );
  recent.push(now);
  ipHits.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
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
    // --- Parse input ---
    const body = await req.json();
    let { name, email, subject, message } = body;
    const { company } = body; // honeypot — real users never fill this

    // Honeypot: if a bot filled the hidden field, pretend success without sending
    if (typeof company === "string" && company.trim() !== "") {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // --- Validate types ---
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof subject !== "string" ||
      typeof message !== "string"
    ) {
      return jsonError("Invalid input types", "INVALID_INPUT", 400, corsHeaders);
    }

    // --- Sanitize ---
    name = stripHtml(name).trim();
    email = email.trim();
    subject = stripHtml(subject).trim();
    message = stripHtml(message).trim();

    // --- Validate ---
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return jsonError(
        `Name must be between ${NAME_MIN} and ${NAME_MAX} characters`,
        "INVALID_INPUT",
        400,
        corsHeaders,
      );
    }
    if (!isValidEmail(email)) {
      return jsonError("Invalid email address", "INVALID_EMAIL", 400, corsHeaders);
    }
    if (subject.length < SUBJECT_MIN || subject.length > SUBJECT_MAX) {
      return jsonError(
        `Subject must be between ${SUBJECT_MIN} and ${SUBJECT_MAX} characters`,
        "INVALID_INPUT",
        400,
        corsHeaders,
      );
    }
    if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
      return jsonError(
        `Message must be between ${MESSAGE_MIN} and ${MESSAGE_MAX} characters`,
        "INVALID_INPUT",
        400,
        corsHeaders,
      );
    }

    // --- Spam detection ---
    if (isSpammy(subject) || isSpammy(message)) {
      return jsonError(
        "Content flagged as spam. Please revise.",
        "SPAM_DETECTED",
        400,
        corsHeaders,
      );
    }

    // --- Rate limit (best-effort, per warm instance) ---
    const ip =
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
      "unknown";
    if (isRateLimited(ip)) {
      return jsonError(
        "Too many messages. Please wait a few minutes and try again.",
        "RATE_LIMITED",
        429,
        corsHeaders,
      );
    }

    // --- Send via Gmail SMTP ---
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: GMAIL_USER, password: GMAIL_APP_PASSWORD },
      },
    });

    try {
      await client.send({
        // Gmail requires the From to be the authenticated account/alias
        from: `Lassen Music Academy <${GMAIL_USER}>`,
        to: CONTACT_TO_EMAIL,
        // Replies go straight to the visitor who submitted the form
        replyTo: `${name} <${email}>`,
        subject: `[Kontakt] ${subject}`,
        content: `Ny besked fra kontaktformularen\n\nNavn: ${name}\nEmail: ${email}\nEmne: ${subject}\n\n${message}\n`,
        html:
          `<h2>Ny besked fra kontaktformularen</h2>` +
          `<p><strong>Navn:</strong> ${escapeHtml(name)}</p>` +
          `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` +
          `<p><strong>Emne:</strong> ${escapeHtml(subject)}</p>` +
          `<hr>` +
          `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
      });
    } finally {
      // Always close the connection, even if send throws
      await client.close();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("send-contact-message error:", err);
    return jsonError(
      "Failed to send message. Please try again later.",
      "EMAIL_FAILED",
      502,
      corsHeaders,
    );
  }
});
