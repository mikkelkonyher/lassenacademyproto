
-- Rate limiting table for forum actions
CREATE TABLE IF NOT EXISTS public.forum_rate_limits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('create_post', 'update_post', 'create_comment', 'update_comment')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookups by user + action + time
CREATE INDEX idx_forum_rate_limits_lookup 
  ON public.forum_rate_limits (user_id, action_type, created_at DESC);

-- Auto-cleanup: delete rate limit entries older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.forum_rate_limits 
  WHERE created_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_cleanup_rate_limits
  AFTER INSERT ON public.forum_rate_limits
  FOR EACH STATEMENT
  EXECUTE FUNCTION cleanup_old_rate_limits();

-- RLS: only service role can manage rate limits (edge functions use service role)
ALTER TABLE public.forum_rate_limits ENABLE ROW LEVEL SECURITY;

-- Add text length constraints at the database level as a safety net
ALTER TABLE public.forum_posts 
  ADD CONSTRAINT chk_post_title_length CHECK (char_length(title) BETWEEN 3 AND 150),
  ADD CONSTRAINT chk_post_body_length CHECK (char_length(body) BETWEEN 10 AND 5000);

ALTER TABLE public.forum_comments 
  ADD CONSTRAINT chk_comment_body_length CHECK (char_length(body) BETWEEN 1 AND 2000);

-- Ensure category is valid
ALTER TABLE public.forum_posts 
  ADD CONSTRAINT chk_post_category CHECK (category IN ('general', 'guitar', 'bass', 'piano', 'vocals', 'theory'));
