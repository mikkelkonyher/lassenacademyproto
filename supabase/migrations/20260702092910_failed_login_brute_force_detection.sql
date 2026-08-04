-- Server-side brute-force detection for failed logins.
-- Records failed login attempts (keyed by resolvable user id, or a salted email
-- hash for non-existent accounts) so a repeated-failure pattern can be detected
-- server-side and surfaced to Sentry. No raw email/PII is stored here.

-- Per-attempt log. identifier = auth user id (uuid text) when the email maps to a
-- real account, else 'email:<sha256>'. ip_hash is a salted hash of the client IP.
create table if not exists public.failed_login_attempts (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

-- Count queries filter by identifier within a recent time window.
create index if not exists failed_login_attempts_identifier_created_idx
  on public.failed_login_attempts (identifier, created_at desc);

-- Dedup guard: ensures at most one Sentry alert per identifier per window.
create table if not exists public.failed_login_alerts (
  identifier text primary key,
  last_alerted_at timestamptz not null default now()
);

-- Lock both tables down. RLS on + no policies + revoked grants => anon and
-- authenticated client roles get zero access. The service role (used by the
-- secure-login edge function) bypasses RLS and keeps its default grant.
alter table public.failed_login_attempts enable row level security;
alter table public.failed_login_alerts enable row level security;
revoke all on public.failed_login_attempts from anon, authenticated;
revoke all on public.failed_login_alerts from anon, authenticated;

-- Resolve a user id from an email, server-side only. auth.users is not reachable
-- via PostgREST, so the edge function calls this SECURITY DEFINER helper (owned by
-- postgres). Restricted to service_role; never exposed to client roles.
create or replace function public.lookup_user_id_by_email(p_email text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id from auth.users where email = lower(p_email) limit 1;
$$;

revoke execute on function public.lookup_user_id_by_email(text) from anon, authenticated, public;
grant execute on function public.lookup_user_id_by_email(text) to service_role;
