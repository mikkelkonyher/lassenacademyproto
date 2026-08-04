-- Polymorphic watchlist: one row per saved course OR lesson per user.
-- CHECK constraint enforces exactly one of course_id / lesson_id is set.
create table user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('course','lesson')),
  course_id uuid references courses(id) on delete cascade,
  lesson_id uuid references lessons(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint exactly_one_target check (
    (item_type = 'course' and course_id is not null and lesson_id is null) or
    (item_type = 'lesson' and lesson_id is not null and course_id is null)
  )
);

-- Per-user uniqueness via partial indexes (nulls don't unique-collide otherwise).
create unique index user_watchlist_course_uniq
  on user_watchlist (user_id, course_id) where item_type = 'course';
create unique index user_watchlist_lesson_uniq
  on user_watchlist (user_id, lesson_id) where item_type = 'lesson';

-- Fast "list my watchlist" + "is this in my watchlist" lookups.
create index user_watchlist_user_idx on user_watchlist (user_id, created_at desc);

alter table user_watchlist enable row level security;

-- Users may only see, insert, and delete their own rows. No update policy:
-- watchlist rows are immutable; toggling = delete + insert.
create policy "own rows select" on user_watchlist for select
  using (auth.uid() = user_id);
create policy "own rows insert" on user_watchlist for insert
  with check (auth.uid() = user_id);
create policy "own rows delete" on user_watchlist for delete
  using (auth.uid() = user_id);
