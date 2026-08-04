
-- Remove the auth.users FKs since we already have FKs to profiles (which itself references auth.users)
-- This eliminates PostgREST ambiguity
ALTER TABLE public.forum_posts DROP CONSTRAINT forum_posts_user_id_fkey;
ALTER TABLE public.forum_comments DROP CONSTRAINT forum_comments_user_id_fkey;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
