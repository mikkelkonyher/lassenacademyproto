-- Prevent PII harvesting: the profiles SELECT policy is USING(true) so any visitor
-- (including anonymous, since the anon key is public) could read every user's email.
-- Postgres RLS is row-level only, so we use COLUMN-level privileges to hide `email`.
-- Replace the blanket table-level SELECT grant with explicit per-column grants that
-- omit `email`. Forum joins and public profile pages only read non-sensitive fields,
-- and a user's own email is still available from their auth session (auth.users.email),
-- so this loses no functionality. service_role (used by Edge Functions) is unaffected.

revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  full_name,
  bio,
  image_url,
  instrument,
  skill_level,
  notify_email,
  notify_course_updates,
  notify_newsletter,
  preferred_language,
  created_at,
  updated_at,
  role
) on public.profiles to anon, authenticated;
