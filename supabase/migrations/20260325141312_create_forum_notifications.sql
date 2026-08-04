
-- Forum notifications table
CREATE TABLE public.forum_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  comment_id uuid NOT NULL REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  commenter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_forum_notifications_user_id ON public.forum_notifications(user_id);
CREATE INDEX idx_forum_notifications_unread ON public.forum_notifications(user_id, is_read) WHERE is_read = false;

ALTER TABLE public.forum_notifications ENABLE ROW LEVEL SECURITY;

-- Users can only read their own notifications
CREATE POLICY "Users can read own notifications" ON public.forum_notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications" ON public.forum_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow inserts from authenticated users (for creating notifications when commenting)
CREATE POLICY "Authenticated users can create notifications" ON public.forum_notifications
  FOR INSERT WITH CHECK (auth.uid() = commenter_id);

-- Function to auto-create notification when a comment is added
CREATE OR REPLACE FUNCTION public.notify_post_owner_on_comment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if the commenter is not the post owner
  IF NEW.user_id != (SELECT user_id FROM public.forum_posts WHERE id = NEW.post_id) THEN
    INSERT INTO public.forum_notifications (user_id, post_id, comment_id, commenter_id)
    VALUES (
      (SELECT user_id FROM public.forum_posts WHERE id = NEW.post_id),
      NEW.post_id,
      NEW.id,
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_forum_comment_created
  AFTER INSERT ON public.forum_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_post_owner_on_comment();
