-- Every new comment produced TWO notification rows: one from this trigger and one
-- from an explicit insert in the create-forum-comment Edge Function. Edge Functions
-- are the single write path for forum mutations, so the trigger is the one to go.
DROP TRIGGER IF EXISTS on_forum_comment_created ON public.forum_comments;
DROP FUNCTION IF EXISTS public.notify_post_owner_on_comment();

-- Clean up the duplicates already stored, keeping one row per (comment_id, user_id).
-- Ordering prefers an already-read row so the cleanup cannot resurrect a
-- notification that the recipient had dismissed, then falls back to the oldest.
DELETE FROM public.forum_notifications
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           row_number() OVER (
             PARTITION BY comment_id, user_id
             ORDER BY is_read DESC, created_at ASC, id ASC
           ) AS rn
    FROM public.forum_notifications
  ) ranked
  WHERE rn > 1
);

-- Permanent guard: one notification per recipient per comment, enforced by the
-- database rather than by convention, so a second write path cannot silently
-- reintroduce duplicates. Keyed on (comment_id, user_id) rather than comment_id
-- alone so a future feature can still notify several participants about one comment.
ALTER TABLE public.forum_notifications
  ADD CONSTRAINT forum_notifications_comment_user_unique UNIQUE (comment_id, user_id);
