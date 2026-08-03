/**
 * Email templates for a completed course purchase.
 *
 * Deliberately PURE: no imports, no `Deno.*`, no I/O. That constraint is what
 * lets Vitest import this file directly from `tests/` — the repo has no Deno
 * test runner, so keeping the copy and formatting logic free of runtime globals
 * is the only way any of it gets covered by automated tests. Sending lives in
 * `_shared/email.ts`; this module only builds strings.
 *
 * Two templates:
 *  - `buildPurchaseEmail`    — the customer's welcome mail (DA/EN)
 *  - `buildSaleNotification` — the academy's internal "new sale" mail (always DA)
 */

/** The two languages the app supports, mirroring the DA/EN toggle */
export type Locale = "da" | "en";

/** Everything both templates need to describe a purchase */
export interface PurchaseEmailInput {
  /** profiles.full_name — null when the user never set one */
  fullName: string | null;
  /** Course title already resolved to the recipient's language */
  courseTitle: string;
  /** Absolute https URL to /courses/:slug */
  courseUrl: string;
  /** What the customer actually paid, in whole DKK */
  pricePaidDkk: number;
  /** When the purchase completed */
  purchasedAt: Date;
  /** Stripe PaymentIntent id — the stable reference for support and refunds */
  paymentReference: string;
  locale: Locale;
}

/** A built email: plain-text and HTML bodies plus the subject line */
export interface BuiltEmail {
  subject: string;
  text: string;
  html: string;
}

/** Brand orange used for the call-to-action button */
const BRAND_ORANGE = "#f97316";

/**
 * Escapes HTML special chars so user-controlled text (names, course titles)
 * can't break out of the markup. Same four characters as the contact form's
 * helper in send-contact-message.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Formats a DKK amount the same way the buy modal does: comma as the decimal
 * separator in Danish, period in English, and whole amounts without decimals.
 */
export function formatPriceDkk(amount: number, locale: Locale): string {
  const hasDecimals = amount % 1 !== 0;
  const formatted = hasDecimals
    ? amount.toFixed(2).replace(".", locale === "da" ? "," : ".")
    : String(amount);
  return `${formatted} kr`;
}

/** Formats a purchase date as a long, human date in the recipient's language */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "da" ? "da-DK" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Picks the first name for the greeting. Returns null when there is no usable
 * name so callers fall back to a neutral greeting rather than printing "null".
 */
function firstName(fullName: string | null): string | null {
  if (!fullName) return null;
  const first = fullName.trim().split(/\s+/)[0];
  return first.length > 0 ? first : null;
}

/** Per-language copy for the customer's welcome mail */
const CUSTOMER_COPY = {
  da: {
    subject: (course: string) => `Velkommen til ${course}`,
    greeting: (name: string | null) => (name ? `Hej ${name},` : "Hej,"),
    intro: (course: string) =>
      `Tak for dit køb. Du har nu fuld adgang til ${course}.`,
    cta: "Gå til kurset",
    accessNote:
      "Kurset ligger klar på din konto — log ind med den samme e-mail, og du " +
      "kan se alle lektioner med det samme.",
    summaryHeading: "Betalingsresumé",
    labelCourse: "Kursus",
    labelAmount: "Beløb",
    labelDate: "Dato",
    labelReference: "Reference",
    help: "Spørgsmål til kurset eller din betaling? Svar på denne mail, så vender vi tilbage.",
    signature: "Lassen Music Academy",
  },
  en: {
    subject: (course: string) => `Welcome to ${course}`,
    greeting: (name: string | null) => (name ? `Hi ${name},` : "Hi there,"),
    intro: (course: string) =>
      `Thank you for your purchase. You now have full access to ${course}.`,
    cta: "Go to the course",
    accessNote:
      "The course is ready on your account — sign in with this same email " +
      "address and every lesson is available right away.",
    summaryHeading: "Payment summary",
    labelCourse: "Course",
    labelAmount: "Amount",
    labelDate: "Date",
    labelReference: "Reference",
    help: "Questions about the course or your payment? Just reply to this email.",
    signature: "Lassen Music Academy",
  },
} as const;

/** Renders one label/value row of the payment summary as HTML */
function summaryRow(label: string, value: string): string {
  return (
    `<tr>` +
    `<td style="padding:6px 16px 6px 0;color:#6b7280;font-size:14px;white-space:nowrap">` +
    `${escapeHtml(label)}</td>` +
    `<td style="padding:6px 0;color:#111827;font-size:14px">${escapeHtml(value)}</td>` +
    `</tr>`
  );
}

/**
 * Builds the customer's welcome email in their own language.
 * All interpolated user data is escaped in the HTML variant.
 */
export function buildPurchaseEmail(input: PurchaseEmailInput): BuiltEmail {
  const c = CUSTOMER_COPY[input.locale];
  const price = formatPriceDkk(input.pricePaidDkk, input.locale);
  const date = formatDate(input.purchasedAt, input.locale);
  const greeting = c.greeting(firstName(input.fullName));

  const text = [
    greeting,
    "",
    c.intro(input.courseTitle),
    "",
    `${c.cta}: ${input.courseUrl}`,
    "",
    c.accessNote,
    "",
    c.summaryHeading,
    `${c.labelCourse}: ${input.courseTitle}`,
    `${c.labelAmount}: ${price}`,
    `${c.labelDate}: ${date}`,
    `${c.labelReference}: ${input.paymentReference}`,
    "",
    c.help,
    "",
    c.signature,
  ].join("\n");

  const html =
    `<div style="margin:0;padding:24px;background:#f4f4f5;` +
    `font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">` +
    `<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;` +
    `padding:32px;color:#111827">` +
    `<p style="margin:0 0 16px;font-size:16px">${escapeHtml(greeting)}</p>` +
    `<p style="margin:0 0 24px;font-size:16px;line-height:1.6">` +
    `${escapeHtml(c.intro(input.courseTitle))}</p>` +
    // Call to action — the whole point of the mail
    `<p style="margin:0 0 24px">` +
    `<a href="${escapeHtml(input.courseUrl)}" ` +
    `style="display:inline-block;background:${BRAND_ORANGE};color:#ffffff;` +
    `text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;` +
    `border-radius:8px">${escapeHtml(c.cta)}</a></p>` +
    `<p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#4b5563">` +
    `${escapeHtml(c.accessNote)}</p>` +
    // Payment summary
    `<div style="border-top:1px solid #e5e7eb;padding-top:20px">` +
    `<p style="margin:0 0 12px;font-size:13px;font-weight:bold;` +
    `text-transform:uppercase;letter-spacing:0.08em;color:#6b7280">` +
    `${escapeHtml(c.summaryHeading)}</p>` +
    `<table style="border-collapse:collapse">` +
    summaryRow(c.labelCourse, input.courseTitle) +
    summaryRow(c.labelAmount, price) +
    summaryRow(c.labelDate, date) +
    summaryRow(c.labelReference, input.paymentReference) +
    `</table></div>` +
    `<p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#4b5563">` +
    `${escapeHtml(c.help)}</p>` +
    `<p style="margin:16px 0 0;font-size:14px;color:#111827">` +
    `${escapeHtml(c.signature)}</p>` +
    `</div></div>`;

  return { subject: c.subject(input.courseTitle), text, html };
}

/**
 * Builds the internal sale notification for the academy inbox. Always Danish —
 * it is read by the team, not the customer — and includes the buyer's email so
 * a sale can be tied to an account without opening the Stripe Dashboard.
 */
export function buildSaleNotification(
  input: PurchaseEmailInput & { buyerEmail: string },
): BuiltEmail {
  const price = formatPriceDkk(input.pricePaidDkk, "da");
  const date = formatDate(input.purchasedAt, "da");
  const buyerName = input.fullName?.trim() || "(intet navn)";

  const text = [
    "Nyt kursussalg",
    "",
    `Kursus: ${input.courseTitle}`,
    `Køber: ${buyerName} <${input.buyerEmail}>`,
    `Beløb: ${price}`,
    `Dato: ${date}`,
    `Reference: ${input.paymentReference}`,
    `Kursusside: ${input.courseUrl}`,
  ].join("\n");

  const html =
    `<div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111827">` +
    `<h2 style="margin:0 0 16px;font-size:18px">Nyt kursussalg</h2>` +
    `<table style="border-collapse:collapse">` +
    summaryRow("Kursus", input.courseTitle) +
    summaryRow("Køber", `${buyerName} <${input.buyerEmail}>`) +
    summaryRow("Beløb", price) +
    summaryRow("Dato", date) +
    summaryRow("Reference", input.paymentReference) +
    summaryRow("Kursusside", input.courseUrl) +
    `</table></div>`;

  return {
    subject: `[Salg] ${input.courseTitle} — ${price}`,
    text,
    html,
  };
}
