-- Reconcile storage objects that were created through the Supabase Dashboard.
--
-- Every other file in this directory is a verbatim copy of a migration that was
-- actually applied, extracted from supabase_migrations.schema_migrations. This
-- one is different: the four changes below were made by clicking around in the
-- Dashboard rather than through a migration, so they exist in production but
-- appear in no migration history.
--
-- Without them a project rebuilt from this repository would come up with a
-- correct database but broken image uploads — NewsEditor and the course/lesson
-- posters (src/utils/courseImage.ts) both write to buckets that would not exist.
--
-- This migration has deliberately NOT been applied to the live project; it is a
-- no-op there and `supabase migration list` will therefore show it as local
-- only. It is written to be idempotent so running it against either a fresh or
-- the existing project is safe.

-- 1. `news-images` — article images, created 2026-04-14 alongside the
--    `add_roles_and_news` migration. No size or MIME restrictions were set.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('news-images', 'news-images', true, null, null)
on conflict (id) do nothing;

-- 2. `course-thumbnails` — course and lesson posters, created 2026-05-21
--    alongside `create_courses_table`. Required because Mux signed playback IDs
--    refuse unsigned image requests, so posters cannot be derived from
--    image.mux.com (see `add_lessons_thumbnail_url`).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-thumbnails', 'course-thumbnails', true, 5242880,
        array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do nothing;

-- 3. `avatars` was created with a 2 MB limit in `create_avatars_storage_bucket`
--    but later raised to 5 MB in the Dashboard.
update storage.buckets
  set file_size_limit = 5242880
  where id = 'avatars';

-- 4. Admin-only write access to `news-images`. There is no SELECT policy on
--    purpose: public buckets are served through /storage/v1/object/public/...,
--    which bypasses RLS entirely — the broad SELECT policies were dropped in
--    `tighten_security_grants_and_policies` for exactly that reason.
drop policy if exists "Admins can upload news images" on storage.objects;
create policy "Admins can upload news images"
  on storage.objects
  for insert
  to public
  with check (
    bucket_id = 'news-images'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

drop policy if exists "Admins can delete news images" on storage.objects;
create policy "Admins can delete news images"
  on storage.objects
  for delete
  to public
  using (
    bucket_id = 'news-images'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- Note: `course-thumbnails` intentionally gets no write policy — none exists in
-- production either. Posters are uploaded with the service role, which bypasses
-- RLS, so adding one here would widen access beyond what is live today.
