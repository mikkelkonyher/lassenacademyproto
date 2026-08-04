-- Revert the brute-force detection objects (feature abandoned at user request).
drop function if exists public.lookup_user_id_by_email(text);
drop table if exists public.failed_login_attempts;
drop table if exists public.failed_login_alerts;
