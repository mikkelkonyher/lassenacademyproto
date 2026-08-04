-- 1. Per-course price (DKK). NULL = not yet for sale.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS price_dkk numeric(10,2);

-- 2. Lesson-level free preview flag. Default false; admin marks the first
--    lesson of each course as true so non-buyers can sample it.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_free_preview boolean NOT NULL DEFAULT false;

-- 3. Purchase ledger. One row per (user, course). Mock-mode entries today,
--    Stripe-backed entries later (same shape).
CREATE TABLE IF NOT EXISTS public.user_course_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  price_paid_dkk numeric(10,2) NOT NULL,
  payment_provider text NOT NULL,
  payment_reference text,
  CONSTRAINT user_course_purchases_unique UNIQUE (user_id, course_id),
  CONSTRAINT user_course_purchases_provider_check CHECK (payment_provider IN ('mock', 'stripe'))
);

CREATE INDEX IF NOT EXISTS user_course_purchases_user_id_idx
  ON public.user_course_purchases(user_id);

CREATE INDEX IF NOT EXISTS user_course_purchases_course_id_idx
  ON public.user_course_purchases(course_id);

-- 4. RLS: users can read their own purchases. No client insert/update/delete —
--    only the create-course-purchase edge function (service role) writes here.
ALTER TABLE public.user_course_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_course_purchases_select_own" ON public.user_course_purchases;
CREATE POLICY "user_course_purchases_select_own"
  ON public.user_course_purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
