-- ============================================================
-- 1. Fix RLS initplan: wrap auth.uid() in (select ...) so it
--    evaluates once per query instead of per row.
-- ============================================================

-- user_lesson_progress (3 policies)
DROP POLICY "Users can read own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can read own progress" ON public.user_lesson_progress
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY "Users can insert own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can insert own progress" ON public.user_lesson_progress
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "Users can update own progress" ON public.user_lesson_progress;
CREATE POLICY "Users can update own progress" ON public.user_lesson_progress
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- user_watchlist (3 policies)
DROP POLICY "own rows select" ON public.user_watchlist;
CREATE POLICY "own rows select" ON public.user_watchlist
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY "own rows insert" ON public.user_watchlist;
CREATE POLICY "own rows insert" ON public.user_watchlist
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY "own rows delete" ON public.user_watchlist;
CREATE POLICY "own rows delete" ON public.user_watchlist
  FOR DELETE USING ((select auth.uid()) = user_id);

-- user_course_purchases (1 policy)
DROP POLICY "user_course_purchases_select_own" ON public.user_course_purchases;
CREATE POLICY "user_course_purchases_select_own" ON public.user_course_purchases
  FOR SELECT USING ((select auth.uid()) = user_id);

-- news (4 admin policies — use subquery in EXISTS)
DROP POLICY "Admins can read all news" ON public.news;
CREATE POLICY "Admins can read all news" ON public.news
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));

DROP POLICY "Admins can insert news" ON public.news;
CREATE POLICY "Admins can insert news" ON public.news
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));

DROP POLICY "Admins can update news" ON public.news;
CREATE POLICY "Admins can update news" ON public.news
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));

DROP POLICY "Admins can delete news" ON public.news;
CREATE POLICY "Admins can delete news" ON public.news
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
  ));

-- ============================================================
-- 2. Fix multiple permissive policies on news: merge the two
--    SELECT policies into one that handles both cases.
-- ============================================================
DROP POLICY "Anyone can read published news" ON public.news;
DROP POLICY "Admins can read all news" ON public.news;
CREATE POLICY "read news" ON public.news
  FOR SELECT USING (
    published = true
    OR EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = (select auth.uid()) AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- 3. Add missing indexes on foreign key columns.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_news_author_id ON public.news (author_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_lesson_id ON public.user_lesson_progress (lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_lesson_progress_course_id ON public.user_lesson_progress (course_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_course_id ON public.user_watchlist (course_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlist_lesson_id ON public.user_watchlist (lesson_id);
