
-- Add indexes for unindexed foreign keys on forum_notifications
CREATE INDEX idx_forum_notifications_comment_id ON public.forum_notifications (comment_id);
CREATE INDEX idx_forum_notifications_commenter_id ON public.forum_notifications (commenter_id);
CREATE INDEX idx_forum_notifications_post_id ON public.forum_notifications (post_id);

-- Drop unused indexes (no queries have used these since creation)
DROP INDEX IF EXISTS public.idx_forum_posts_category;
DROP INDEX IF EXISTS public.idx_forum_comments_user_id;
DROP INDEX IF EXISTS public.idx_forum_notifications_unread;
