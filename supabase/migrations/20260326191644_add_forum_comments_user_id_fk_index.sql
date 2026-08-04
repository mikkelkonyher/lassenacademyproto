
-- Add index for unindexed foreign key forum_comments.user_id -> profiles.id
CREATE INDEX idx_forum_comments_user_id ON public.forum_comments (user_id);
