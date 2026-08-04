-- Narrow payment_provider to 'stripe' only.
--
-- The mock provider is gone: the `create-course-purchase` edge function was
-- deleted on 28 July 2026 and its five legacy rows removed. `stripe-webhook`
-- is now the sole writer to this table (RLS exposes SELECT only, so no client
-- can insert), and it always sets 'stripe' explicitly — the column has no
-- default and is NOT NULL.
--
-- Widen this list again if a second provider is ever added; MobilePay does not
-- count, since it reaches us through Stripe's dynamic payment methods.
alter table public.user_course_purchases
  drop constraint if exists user_course_purchases_provider_check;

alter table public.user_course_purchases
  add constraint user_course_purchases_provider_check
  check (payment_provider = 'stripe');
