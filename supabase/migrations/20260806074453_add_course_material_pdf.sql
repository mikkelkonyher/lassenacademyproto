-- Paid course material (chord charts, notes) attached to a course.
--
-- Unlike every other bucket in this project this one is PRIVATE. A public bucket
-- is served through /storage/v1/object/public/... which bypasses RLS entirely,
-- so anyone holding the URL would get the PDF regardless of whether they bought
-- the course. Access is handed out exclusively as short-lived signed URLs by the
-- get-course-material Edge Function, after it verifies user_course_purchases.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('course-materials', 'course-materials', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

-- No storage policies on purpose, exactly like course-thumbnails: the service
-- role bypasses RLS and the Edge Function is the only reader. Adding a policy
-- would widen access beyond what the paywall allows.

-- Opaque path inside the private bucket, e.g. '<course-id>/materiale.pdf'.
-- The "Anyone can read published courses" policy exposes this string publicly,
-- which is harmless: without a signed URL the path grants no access at all.
alter table public.courses add column if not exists pdf_path text;

comment on column public.courses.pdf_path is
  'Path to the course PDF inside the private course-materials bucket. Null when the course has no material. Only ever exchanged for a signed URL by get-course-material.';
