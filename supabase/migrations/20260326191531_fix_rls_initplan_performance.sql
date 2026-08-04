
-- Wrap auth.uid() in (select ...) so it is evaluated once per query, not per row.
-- This resolves the auth_rls_initplan performance warning on all affected policies.

-- ==================== profiles ====================

DROP POLICY "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO public
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile" ON public.profiles
  FOR DELETE TO public
  USING ((select auth.uid()) = id);

-- ==================== forum_posts ====================

DROP POLICY "Authenticated users can create posts" ON public.forum_posts;
CREATE POLICY "Authenticated users can create posts" ON public.forum_posts
  FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can update own posts" ON public.forum_posts;
CREATE POLICY "Users can update own posts" ON public.forum_posts
  FOR UPDATE TO public
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can delete own posts" ON public.forum_posts;
CREATE POLICY "Users can delete own posts" ON public.forum_posts
  FOR DELETE TO public
  USING ((select auth.uid()) = user_id);

-- ==================== forum_comments ====================

DROP POLICY "Authenticated users can create comments" ON public.forum_comments;
CREATE POLICY "Authenticated users can create comments" ON public.forum_comments
  FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can update own comments" ON public.forum_comments;
CREATE POLICY "Users can update own comments" ON public.forum_comments
  FOR UPDATE TO public
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can delete own comments" ON public.forum_comments;
CREATE POLICY "Users can delete own comments" ON public.forum_comments
  FOR DELETE TO public
  USING ((select auth.uid()) = user_id);

-- ==================== forum_notifications ====================

DROP POLICY "Users can read own notifications" ON public.forum_notifications;
CREATE POLICY "Users can read own notifications" ON public.forum_notifications
  FOR SELECT TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY "Users can update own notifications" ON public.forum_notifications;
CREATE POLICY "Users can update own notifications" ON public.forum_notifications
  FOR UPDATE TO public
  USING ((select auth.uid()) = user_id);

DROP POLICY "Authenticated users can create notifications" ON public.forum_notifications;
CREATE POLICY "Authenticated users can create notifications" ON public.forum_notifications
  FOR INSERT TO public
  WITH CHECK ((select auth.uid()) = commenter_id);
