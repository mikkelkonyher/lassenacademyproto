-- "What's included" bullets, localized. NULL = use no fallback (page hides the
-- block). Owner edits these via Supabase Studio for now.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS includes_da text[],
  ADD COLUMN IF NOT EXISTS includes_en text[];
