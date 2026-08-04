-- Static poster image for a lesson, stored in the `course-thumbnails` bucket.
-- Needed because Mux signed playback IDs cannot serve thumbnails to viewers
-- who hold no token — which includes anonymous catalogue visitors and, in the
-- LessonPlayer sidebar, users who have not bought the course. Deriving posters
-- from image.mux.com therefore stops working the moment a lesson is flipped to
-- the `signed` playback policy.
alter table public.lessons
  add column if not exists thumbnail_url text;

comment on column public.lessons.thumbnail_url is
  'Public URL of the lesson poster in Supabase Storage. Replaces image.mux.com derivation, which breaks under signed playback.';
