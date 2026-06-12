-- Post-deploy security hardening (database-linter findings 0014, 0028, 0029).

-- pg_net was created in the public schema by the previous migration; Supabase
-- convention keeps extensions out of exposed schemas. Drop and recreate
-- rather than ALTER ... SET SCHEMA because older pg_net versions (hosted)
-- don't support relocation. Its callable objects live in the dedicated `net`
-- schema either way, so the cron jobs that use net.http_post are unaffected,
-- and only the transient request/response queue tables are discarded.
drop extension if exists pg_net;
create extension pg_net with schema extensions;

-- generate_daily_tasks is SECURITY DEFINER and was callable by anon and
-- authenticated roles through the default PUBLIC execute grant (exposed at
-- /rest/v1/rpc/generate_daily_tasks). Only pg_cron (postgres) should run it.
revoke execute on function public.generate_daily_tasks() from public, anon, authenticated;
