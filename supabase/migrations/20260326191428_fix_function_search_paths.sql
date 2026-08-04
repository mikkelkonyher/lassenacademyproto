
-- Fix mutable search_path on all three functions by recreating with SET search_path = ''

CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.forum_rate_limits 
  WHERE created_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_post_owner_on_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
