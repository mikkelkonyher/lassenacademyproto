import { describe, it, expect } from "vitest";
import {
  buildPurchaseEmail,
  buildSaleNotification,
  escapeHtml,
  formatDate,
  formatPriceDkk,
  type PurchaseEmailInput,
} from "../supabase/functions/_shared/purchaseEmail";

// ── Why this file lives here ─────────────────────────────────
// purchaseEmail.ts is an edge-function module, but it is deliberately free of
// Deno globals and imports so Vitest can load it directly. The repo has no Deno
// test runner, so this is the only automated coverage the purchase emails get —
// the sending itself (SMTP) and the webhook wiring are verified by hand.

// ── Fixtures ─────────────────────────────────────────────────

const BASE: PurchaseEmailInput = {
  fullName: "Mikkel Konyher",
  courseTitle: "Begynder Guitar",
  courseUrl: "https://lassenacademyproto.vercel.app/courses/begynder-guitar",
  pricePaidDkk: 390,
  purchasedAt: new Date("2026-08-03T10:00:00Z"),
  paymentReference: "pi_3ABCdef456",
  locale: "da",
};

describe("formatPriceDkk", () => {
  it("prints whole amounts without decimals", () => {
    expect(formatPriceDkk(390, "da")).toBe("390 kr");
    expect(formatPriceDkk(390, "en")).toBe("390 kr");
  });

  // Matches the buy modal: Danish uses a comma as the decimal separator
  it("uses a locale-appropriate decimal separator", () => {
    expect(formatPriceDkk(390.5, "da")).toBe("390,50 kr");
    expect(formatPriceDkk(390.5, "en")).toBe("390.50 kr");
  });
});

describe("formatDate", () => {
  it("renders a long date in the recipient's language", () => {
    expect(formatDate(new Date("2026-08-03T10:00:00Z"), "da")).toMatch(
      /august.*2026/i,
    );
    expect(formatDate(new Date("2026-08-03T10:00:00Z"), "en")).toMatch(
      /August.*2026/,
    );
  });
});

describe("escapeHtml", () => {
  it("neutralises the four HTML-significant characters", () => {
    expect(escapeHtml('&<>"')).toBe("&amp;&lt;&gt;&quot;");
  });

  it("leaves ordinary text untouched", () => {
    expect(escapeHtml("Begynder Guitar — fra 0 til helt")).toBe(
      "Begynder Guitar — fra 0 til helt",
    );
  });
});

describe("buildPurchaseEmail", () => {
  it("builds a Danish welcome mail", () => {
    const mail = buildPurchaseEmail(BASE);

    expect(mail.subject).toBe("Velkommen til Begynder Guitar");
    expect(mail.text).toContain("Hej Mikkel,");
    expect(mail.text).toContain("Tak for dit køb");
    expect(mail.text).toContain("Betalingsresumé");
    expect(mail.text).toContain("390 kr");
    expect(mail.text).toContain("pi_3ABCdef456");
  });

  it("builds an English welcome mail", () => {
    const mail = buildPurchaseEmail({ ...BASE, locale: "en" });

    expect(mail.subject).toBe("Welcome to Begynder Guitar");
    expect(mail.text).toContain("Hi Mikkel,");
    expect(mail.text).toContain("Thank you for your purchase");
    expect(mail.text).toContain("Payment summary");
    // No Danish copy should leak into the English variant
    expect(mail.text).not.toContain("Tak for dit køb");
  });

  // The link is the entire point of the mail — it must survive into both bodies
  it("includes the course URL in both the text and HTML bodies", () => {
    const mail = buildPurchaseEmail(BASE);

    expect(mail.text).toContain(BASE.courseUrl);
    expect(mail.html).toContain(`href="${BASE.courseUrl}"`);
  });

  it("falls back to a neutral greeting when there is no name", () => {
    const noName = buildPurchaseEmail({ ...BASE, fullName: null });
    expect(noName.text).toContain("Hej,");
    expect(noName.text).not.toContain("null");

    const blankName = buildPurchaseEmail({ ...BASE, fullName: "   " });
    expect(blankName.text).toContain("Hej,");

    const english = buildPurchaseEmail({
      ...BASE,
      fullName: null,
      locale: "en",
    });
    expect(english.text).toContain("Hi there,");
  });

  it("greets with the first name only", () => {
    const mail = buildPurchaseEmail({ ...BASE, fullName: "Anna Marie Berg" });
    expect(mail.text).toContain("Hej Anna,");
  });

  // Course titles and names are user/admin-controlled, so they must not be able
  // to inject markup into the HTML body.
  it("escapes user-controlled text in the HTML body", () => {
    const mail = buildPurchaseEmail({
      ...BASE,
      courseTitle: '<script>alert("x")</script>',
      fullName: "<b>Mikkel</b>",
    });

    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<b>Mikkel</b>");
    expect(mail.html).toContain("&lt;script&gt;");
    // The plain-text body is not markup, so it needs no escaping
    expect(mail.text).toContain('<script>alert("x")</script>');
  });
});

describe("buildSaleNotification", () => {
  it("reports the sale in Danish with the buyer's details", () => {
    const mail = buildSaleNotification({
      ...BASE,
      buyerEmail: "kunde@example.com",
    });

    expect(mail.subject).toBe("[Salg] Begynder Guitar — 390 kr");
    expect(mail.text).toContain("Nyt kursussalg");
    expect(mail.text).toContain("Mikkel Konyher <kunde@example.com>");
    expect(mail.text).toContain("390 kr");
    expect(mail.text).toContain("pi_3ABCdef456");
    expect(mail.html).toContain("kunde@example.com");
  });

  // The academy reads this one, not the customer — language never switches
  it("stays Danish even when the customer's locale is English", () => {
    const mail = buildSaleNotification({
      ...BASE,
      locale: "en",
      buyerEmail: "kunde@example.com",
    });

    expect(mail.text).toContain("Nyt kursussalg");
    expect(mail.text).toContain("Beløb: 390 kr");
  });

  it("marks a missing buyer name rather than printing null", () => {
    const mail = buildSaleNotification({
      ...BASE,
      fullName: null,
      buyerEmail: "kunde@example.com",
    });

    expect(mail.text).toContain("(intet navn)");
    expect(mail.text).not.toContain("null");
  });
});
