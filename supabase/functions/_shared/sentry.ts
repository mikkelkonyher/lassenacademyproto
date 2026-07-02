// @ts-nocheck — Deno edge function module, not compiled by project TypeScript
/**
 * Shared Sentry setup for Supabase Edge Functions (Deno runtime).
 *
 * Provides a single initialized Sentry client plus a `reportError()` helper so
 * every function reports unhandled errors the same way without duplicating the
 * init + flush boilerplate. Dirs prefixed with `_` are ignored by Supabase's
 * function deploy; relative imports here are bundled into each function.
 */
// Direct npm specifier (not an import-map alias) so both the CLI bundler and the
// MCP deploy resolve it without a separate import map. npm compatibility is GA on
// the Supabase Edge runtime.
import * as Sentry from "npm:@sentry/deno@10";

// Initialize once at module load. No-ops gracefully if SENTRY_DSN is unset
// (e.g. local dev or before the secret is configured), so functions never break
// just because Sentry isn't set up yet.
//
// `defaultIntegrations: false` is required on Supabase's Deno runtime: the Sentry
// Deno SDK can't instrument `Deno.serve`, so a reused isolate would otherwise leak
// breadcrumbs/context across requests. We instead scope every event via withScope
// in reportError() below. (Per Supabase's official Sentry monitoring guide.)
Sentry.init({
  dsn: Deno.env.get("SENTRY_DSN"),
  // Tag events with the deploy environment; defaults to "production".
  environment: Deno.env.get("SENTRY_ENVIRONMENT") ?? "production",
  defaultIntegrations: false,
  // Error capture only — no performance tracing for now.
  tracesSampleRate: 0,
});

/**
 * Capture an exception (tagged with the originating function name) and FLUSH
 * before the handler returns. The flush is critical in serverless: the isolate
 * can be suspended immediately after the response, dropping any unsent events.
 *
 * All calls are wrapped in withScope so context stays isolated per-request even
 * when the isolate is reused (see the defaultIntegrations note above).
 *
 * @param fn    Name of the Edge Function reporting the error (used as a tag).
 * @param err   The caught error/exception.
 * @param extra Optional extra context attached to the Sentry event.
 */
export async function reportError(
  fn: string,
  err: unknown,
  extra?: Record<string, unknown>,
): Promise<void> {
  Sentry.withScope((scope) => {
    scope.setTag("function", fn);
    // Supabase-provided runtime tags help pinpoint which region/invocation failed.
    scope.setTag("region", Deno.env.get("SB_REGION"));
    scope.setTag("execution_id", Deno.env.get("SB_EXECUTION_ID"));
    if (extra) scope.setExtras(extra);
    Sentry.captureException(err);
  });
  // Wait up to 2s for delivery before the isolate may freeze.
  await Sentry.flush(2000);
}
