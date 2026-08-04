create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,

  -- i18n content (matches news table pattern)
  title_da text not null,
  title_en text not null,
  level_da text not null,
  level_en text not null,
  description_da text,
  description_en text,

  -- Metadata
  instructor text not null,
  image_url text not null,
  tags text[] default '{}',

  -- Mux columns (nullable; webhook populates after upload completes)
  mux_playback_id text,
  mux_asset_id text,
  mux_playback_policy text default 'public'
    check (mux_playback_policy in ('public', 'signed')),
  duration_seconds int,
  aspect_ratio text,

  -- Subscription gating (binary: free or subscriber)
  access_tier text default 'free'
    check (access_tier in ('free', 'subscriber')),

  -- Display + state
  published boolean default true,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.courses enable row level security;

create policy "Anyone can read published courses"
  on public.courses for select
  using (published = true);

create index courses_sort_idx on public.courses (sort_order, created_at desc);
