/**
 * usePurchaseReturn — handles the return trip from Stripe Checkout.
 *
 * `create-checkout-session` sends the customer back to
 * `/courses/:slug?purchase=success&session_id=…` (or `?purchase=cancelled`).
 *
 * Timing is the opposite of what you might expect: Stripe delivers
 * `checkout.session.completed` to our webhook and waits for a 2xx *before*
 * redirecting, giving up only after ~10 s. So by the time the browser lands
 * here the purchase row normally already exists. The polling below is the
 * fallback for when it doesn't — a webhook cold start has been measured at
 * over 5 s, and exceeding the budget means Stripe redirects early. The payment
 * still lands (Stripe retries); the user would just briefly see "not
 * purchased".
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export type PurchaseReturnStatus =
  | "idle"
  | "confirming"
  | "confirmed"
  | "timeout"
  | "cancelled";

/** Poll cadence and ceiling — roughly 12 s of patience before giving up. */
const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 8;

export type UsePurchaseReturnResult = {
  status: PurchaseReturnStatus;
  dismiss: () => void;
};

export function usePurchaseReturn(
  courseId: string | null | undefined,
): UsePurchaseReturnResult {
  const { purchasedCourseIds, refreshPurchases } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Captured once. The query string is stripped immediately below, so reading
  // it on later renders would make the banner vanish on the next render.
  const [outcome] = useState<string | null>(() => searchParams.get("purchase"));
  const [pollExhausted, setPollExhausted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // `refreshPurchases` is recreated on every AuthProvider render, so it can't
  // go in a dependency array without looping. Keep the latest one in a ref.
  const refreshRef = useRef(refreshPurchases);
  useEffect(() => {
    refreshRef.current = refreshPurchases;
  });

  const owned = courseId ? purchasedCourseIds.has(courseId) : false;

  // Strip the Stripe params so a reload — or a link the user shares — doesn't
  // replay the banner.
  useEffect(() => {
    if (!searchParams.has("purchase") && !searchParams.has("session_id")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("purchase");
    next.delete("session_id");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  // Poll until the webhook's row shows up. Re-runs when `owned` flips, and the
  // cleanup then cancels the pending timer.
  useEffect(() => {
    if (outcome !== "success" || !courseId || owned) return;

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attempts += 1;
      await refreshRef.current();
      if (cancelled) return;
      if (attempts >= MAX_POLLS) {
        setPollExhausted(true);
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    };

    timer = setTimeout(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [outcome, courseId, owned]);

  const dismiss = useCallback(() => setDismissed(true), []);

  // Derived rather than stored, so ownership arriving from anywhere — the poll,
  // a background refresh, another tab — resolves the banner.
  let status: PurchaseReturnStatus;
  if (dismissed || (outcome !== "success" && outcome !== "cancelled")) {
    status = "idle";
  } else if (outcome === "cancelled") {
    status = "cancelled";
  } else if (owned) {
    status = "confirmed";
  } else {
    status = pollExhausted ? "timeout" : "confirming";
  }

  return { status, dismiss };
}
