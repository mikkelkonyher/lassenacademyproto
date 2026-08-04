-- Track per-user, per-lesson video watch progress and resume position.
create table public.user_lesson_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  lesson_id        uuid not null references public.lessons(id) on delete cascade,
  course_id        uuid not null references public.courses(id) on delete cascade,
  position_seconds double precision not null default 0,
  duration_seconds double precision not null default 0,
  completed        boolean not null default false,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (user_id, lesson_id)
);

-- Fast lookup: all progress for a user within a specific course
create index idx_user_lesson_progress_user_course
  on public.user_lesson_progress (user_id, course_id);

-- Auto-update updated_at on every upsert
create trigger user_lesson_progress_updated_at
  before update on public.user_lesson_progress
  for each row
  execute function public.handle_updated_at();

-- RLS: users can only access their own progress rows
alter table public.user_lesson_progress enable row level security;

create policy "Users can read own progress"
  on public.user_lesson_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on public.user_lesson_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.user_lesson_progress for update
  using (auth.uid() = user_id);
