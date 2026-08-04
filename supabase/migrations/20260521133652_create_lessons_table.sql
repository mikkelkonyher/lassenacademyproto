create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  slug text not null,

  -- i18n content (matches news + courses pattern)
  title_da text not null,
  title_en text not null,
  description_da text,
  description_en text,

  -- Mux columns — nullable while video is in flight, populated after upload
  mux_playback_id text,
  mux_asset_id text,
  mux_playback_policy text default 'public'
    check (mux_playback_policy in ('public', 'signed')),
  duration_seconds int,
  aspect_ratio text,

  -- Display + state
  sort_order int default 0,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- Same slug can exist in different courses, but must be unique per course
  unique (course_id, slug)
);

alter table public.lessons enable row level security;

-- Lessons are readable when both the lesson and its parent course are published
create policy "Anyone can read published lessons of published courses"
  on public.lessons for select
  using (
    published = true
    and exists (
      select 1 from public.courses c
      where c.id = lessons.course_id and c.published = true
    )
  );

create index lessons_course_sort_idx on public.lessons (course_id, sort_order, created_at);
