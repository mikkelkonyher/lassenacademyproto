
-- Replace the restrictive read policy with one that allows all authenticated users to read profiles
-- This is needed for forum posts/comments to show author names and avatars
DROP POLICY "Users can read own profile" ON public.profiles;

CREATE POLICY "Authenticated users can read all profiles" ON public.profiles
  FOR SELECT USING (true);
