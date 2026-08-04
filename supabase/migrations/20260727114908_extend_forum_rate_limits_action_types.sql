-- Extend the allowed action_type values on forum_rate_limits.
--
-- The original CHECK only listed the four forum create/update actions, but
-- deployed edge functions also write 'delete_post', 'delete_comment' and
-- 'create_course_purchase'. Those inserts were rejected by the constraint and
-- the failures were swallowed (the functions do not inspect the insert error),
-- so the corresponding rate limits never counted anything and never triggered.
--
-- 'create_checkout_session' is added for the new Stripe checkout function.
alter table public.forum_rate_limits
  drop constraint forum_rate_limits_action_type_check;

alter table public.forum_rate_limits
  add constraint forum_rate_limits_action_type_check
  check (action_type = any (array[
    'create_post',
    'update_post',
    'delete_post',
    'create_comment',
    'update_comment',
    'delete_comment',
    'create_course_purchase',
    'create_checkout_session'
  ]::text[]));
