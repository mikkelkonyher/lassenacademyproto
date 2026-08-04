-- 1. Tighten grants on public.news
--    Previously anon had full DELETE/INSERT/UPDATE on the table.
--    RLS protected against abuse, but table-level grants should be minimal.
--    anon only needs to read news; writes go through authenticated/service_role.
revoke insert, update, delete, truncate, references, trigger on public.news from anon;

-- 2. Lock down forum_rate_limits — only service_role (used by Edge Functions) should touch it.
--    Authenticated grants were unused and confusing (RLS blocked everything because
--    no policies existed). Revoking makes the intent explicit.
revoke all on public.forum_rate_limits from authenticated;

-- 3. SECURITY DEFINER trigger functions should not be callable via /rest/v1/rpc.
--    Triggers still fire because they run as table-owner, independent of EXECUTE grants.
revoke execute on function public.handle_new_user()    from anon, authenticated, public;
revoke execute on function public.handle_updated_at()  from anon, authenticated, public;

-- 4. Remove broad SELECT policies on storage.objects for public buckets.
--    Public buckets serve files via /storage/v1/object/public/<bucket>/<path>,
--    which bypasses RLS. The broad SELECT policies only enabled listing all files
--    via the Storage API — which we don't use anywhere in the app.
drop policy if exists "Anyone can view avatars"     on storage.objects;
drop policy if exists "Anyone can read news images" on storage.objects;
