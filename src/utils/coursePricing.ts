/**
 * coursePricing.ts — Shared course-price helpers.
 *
 * Holds the single source of truth for the 2026 promotional discount so the
 * pricing page, the buy modal, and the edge function agree on what a customer
 * actually pays. The discount applies for the entire calendar year 2026 in
 * UTC; outside that window callers see the unchanged base price.
 */

// 35% off, active for all of calendar year 2026 (UTC)
export const COURSE_DISCOUNT_PERCENT = 35;
const PROMO_START_UTC = Date.UTC(2026, 0, 1, 0, 0, 0);
const PROMO_END_UTC = Date.UTC(2027, 0, 1, 0, 0, 0);

// True while the promo window is active (caller-controllable for testing)
export function isDiscountActive(now: Date = new Date()): boolean {
  const t = now.getTime();
  return t >= PROMO_START_UTC && t < PROMO_END_UTC;
}

export interface CoursePricing {
  // Original sticker price before any promo
  basePrice: number;
  // What the customer actually pays today
  effectivePrice: number;
  // True if a discount is being applied right now
  discountActive: boolean;
  // Percent off (only meaningful when discountActive)
  discountPercent: number;
}

/**
 * Compute the live pricing for a course. Returns base == effective when no
 * promo is active. Rounds the discounted price to whole DKK to keep the
 * display clean and avoid stray øre amounts on the receipt.
 */
export function getCoursePricing(
  basePrice: number | null | undefined,
  now: Date = new Date(),
): CoursePricing | null {
  if (basePrice == null || Number(basePrice) <= 0) return null;
  const price = Number(basePrice);
  const active = isDiscountActive(now);
  const effective = active
    ? Math.round(price * (1 - COURSE_DISCOUNT_PERCENT / 100))
    : price;
  return {
    basePrice: price,
    effectivePrice: effective,
    discountActive: active,
    discountPercent: active ? COURSE_DISCOUNT_PERCENT : 0,
  };
}
