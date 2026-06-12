-- Schedule the push-notification fan-out and the nightly plant-catalog syncs.
--
-- All four jobs invoke Edge Functions over HTTP via pg_net. The project URL
-- and secret key are read from Vault at run time — run once per environment
-- (SQL editor / psql) before these jobs can succeed:
--
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('sb_secret_...', 'secret_key');
--
-- Until the secrets exist the jobs fail harmlessly on each tick (visible in
-- cron.job_run_details). Locally, point project_url at
-- http://host.docker.internal:54321 (reachable from inside the db container).

create extension if not exists pg_net;

-- ── Resumable sync cursor for the incremental catalog syncs ──────────────────
-- trefle-sync and perenual-sync process ~100 s of pages per invocation and
-- persist where to resume here (source = 'trefle' | 'perenual'). RLS is
-- enabled with no policies: only the service role (Edge Functions) can touch
-- this table.

create table sync_state (
  source text primary key,
  next_page int not null default 1,
  updated_at timestamptz not null default now()
);

alter table sync_state enable row level security;

-- ── Helper: invoke an Edge Function with the Vault-stored credentials ─────────
-- Sends both apiKey and Authorization headers to satisfy secret-key auth.
-- SECURITY INVOKER (default): callable only by roles that can read Vault,
-- i.e. postgres — which is what pg_cron runs as. Belt-and-braces, we also
-- revoke the default PUBLIC execute grant.

create or replace function public.invoke_edge_function(function_name text)
returns bigint
language sql
set search_path = ''
as $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apiKey', (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key'),
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'secret_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
$$;

revoke execute on function public.invoke_edge_function(text) from public, anon, authenticated;

-- ── Schedules (UTC) ──────────────────────────────────────────────────────────

-- 06:15 — push fan-out, 15 min after generate_daily_tasks (06:00) inserts
-- the day's tasks.
select cron.schedule(
  'send-push-fanout',
  '15 6 * * *',
  $$select public.invoke_edge_function('send-push');$$
);

-- 03:00 — Permapeople full-catalog sync (loops all pages in one call).
select cron.schedule(
  'permapeople-sync-nightly',
  '0 3 * * *',
  $$select public.invoke_edge_function('permapeople-sync');$$
);

-- 03:30 — Trefle incremental sync (resumes from sync_state).
select cron.schedule(
  'trefle-sync-nightly',
  '30 3 * * *',
  $$select public.invoke_edge_function('trefle-sync');$$
);

-- 04:00 — Perenual incremental sync (resumes from sync_state).
select cron.schedule(
  'perenual-sync-nightly',
  '0 4 * * *',
  $$select public.invoke_edge_function('perenual-sync');$$
);
