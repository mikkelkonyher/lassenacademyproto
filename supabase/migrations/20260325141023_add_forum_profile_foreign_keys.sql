
-- Add foreign keys from forum tables to profiles so PostgREST can resolve the joins
ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.forum_comments
  ADD CONSTRAINT forum_comments_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
