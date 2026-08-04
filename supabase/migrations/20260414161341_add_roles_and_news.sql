
-- Add role column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

-- Create the news table
CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title_da TEXT NOT NULL CHECK (char_length(title_da) BETWEEN 1 AND 200),
  title_en TEXT NOT NULL CHECK (char_length(title_en) BETWEEN 1 AND 200),
  body_da TEXT NOT NULL CHECK (char_length(body_da) BETWEEN 1 AND 10000),
  body_en TEXT NOT NULL CHECK (char_length(body_en) BETWEEN 1 AND 10000),
  image_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Anyone can read published news
CREATE POLICY "Anyone can read published news"
  ON public.news FOR SELECT
  USING (published = true);

-- Admins can read all news (including unpublished)
CREATE POLICY "Admins can read all news"
  ON public.news FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can insert news
CREATE POLICY "Admins can insert news"
  ON public.news FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can update news
CREATE POLICY "Admins can update news"
  ON public.news FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can delete news
CREATE POLICY "Admins can delete news"
  ON public.news FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_news_published_created
  ON public.news (published, created_at DESC);
