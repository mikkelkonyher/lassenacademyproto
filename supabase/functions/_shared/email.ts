// @ts-nocheck — Deno edge function module, not compiled by project TypeScript
/**
 * Shared Gmail SMTP sender for Supabase Edge Functions (Deno runtime).
 *
 * Wraps denomailer so functions that need to send mail don't each repeat the
 * connection setup. Reuses the same Gmail account already configured for
 * Supabase Auth → SMTP; Edge Functions can't read the Auth SMTP secret, so the
 * app password is supplied separately as an Edge Function secret.
 *
 * Secrets (Deno.env): GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO_EMAIL.
 *
 * Note: send-contact-message predates this module and still constructs its own
 * SMTPClient. Both talk to the same account with the same settings.
 */
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER")!;
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD")!;

/** The academy inbox — where contact messages and sale notifications land */
export const CONTACT_TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL") ??
  "info@lassenmusik.com";

export interface SendMailOptions {
  to: string;
  subject: string;
  /** Plain-text body — always send one alongside the HTML */
  text: string;
  html: string;
  /** Where replies should go; defaults to the sending account */
  replyTo?: string;
}

/**
 * Sends one email over Gmail SMTP. Throws on failure so the caller decides
 * whether that matters — connections are always closed, even when send throws.
 */
export async function sendMail(opts: SendMailOptions): Promise<void> {
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
      to: opts.to,
      replyTo: opts.replyTo,
      subject: opts.subject,
      content: opts.text,
      html: opts.html,
    });
  } finally {
    // Always close the connection, even if send throws
    await client.close();
  }
}
