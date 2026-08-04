
-- Forum posts table
CREATE TABLE public.forum_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('general', 'guitar', 'bass', 'piano', 'vocals', 'theory')),
  title text NOT NULL CHECK (char_length(title) >= 3 AND char_length(title) <= 200),
  body text NOT NULL CHECK (char_length(body) >= 3 AND char_length(body) <= 5000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Forum comments table
CREATE TABLE public.forum_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) >= 1 AND char_length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_forum_posts_user_id ON public.forum_posts(user_id);
CREATE INDEX idx_forum_posts_category ON public.forum_posts(category);
CREATE INDEX idx_forum_posts_created_at ON public.forum_posts(created_at DESC);
CREATE INDEX idx_forum_comments_post_id ON public.forum_comments(post_id);
CREATE INDEX idx_forum_comments_user_id ON public.forum_comments(user_id);

-- Enable RLS
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;

-- Posts: anyone authenticated can read
CREATE POLICY "Anyone can read posts" ON public.forum_posts
  FOR SELECT USING (true);

-- Posts: authenticated users can create
CREATE POLICY "Authenticated users can create posts" ON public.forum_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Posts: users can update their own
CREATE POLICY "Users can update own posts" ON public.forum_posts
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Posts: users can delete their own
CREATE POLICY "Users can delete own posts" ON public.forum_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Comments: anyone can read
CREATE POLICY "Anyone can read comments" ON public.forum_comments
  FOR SELECT USING (true);

-- Comments: authenticated users can create
CREATE POLICY "Authenticated users can create comments" ON public.forum_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Comments: users can update their own
CREATE POLICY "Users can update own comments" ON public.forum_comments
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comments: users can delete their own
CREATE POLICY "Users can delete own comments" ON public.forum_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER forum_posts_updated_at
  BEFORE UPDATE ON public.forum_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER forum_comments_updated_at
  BEFORE UPDATE ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
