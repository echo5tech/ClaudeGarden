# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Cross-platform gardening app answering "What should I plant now?", "How do I arrange them?", and "How can I share this?". Three surfaces share one Postgres backend.

## Surfaces

| Path | Stack | Purpose |
|---|---|---|
| `apps/web` | Next.js 16 (App Router), Tailwind 4, shadcn/ui, dnd-kit | Drag-and-drop garden bed designer |
| `apps/mobile` | Expo SDK 56, expo-router, NativeWind | Daily reminder push, camera-based progress photos |
| `supabase/` | Postgres + RLS, Storage, Edge Functions, pg_cron | Auth, social-graph row-level security, scheduled task generation, Permapeople sync |

Both `apps/web` and `apps/mobile` contain their own `AGENTS.md` warning that Next.js 16 and Expo SDK 56 have **breaking API changes vs. older Claude training data**. Before writing code in either app, consult `node_modules/next/dist/docs/` (web) or https://docs.expo.dev/versions/v56.0.0/ (mobile). Do not assume Next.js 14/15 or Expo SDK 50 conventions still apply.

## Commands

Run from repo root unless noted.

```bash
pnpm install                  # install + link workspace packages
pnpm dev                      # turbo runs all dev tasks
pnpm web                      # apps/web only (Next.js dev server on :3000)
pnpm mobile                   # apps/mobile only (Expo dev server)
pnpm build                    # turbo build all apps
pnpm check-types              # turbo tsc --noEmit across the workspace
pnpm lint                     # turbo lint across the workspace
pnpm test                     # turbo test (Vitest unit tests in packages/shared)

pnpm db:start                 # boot local Supabase stack (Docker required)
pnpm db:stop                  # stop the stack
pnpm db:reset                 # drop + recreate + apply migrations + seed
pnpm db:migrate:new <name>    # scaffold a new timestamped migration
pnpm db:types                 # regenerate packages/database/src/types.ts from local schema
pnpm db:lint                  # run supabase lint on the schema
```

Local Supabase URLs (after `db:start`):
- API: `http://127.0.0.1:54321`
- Studio: `http://127.0.0.1:54323`
- Postgres: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

Edge Function local invocation:
```bash
supabase functions serve send-push          # serves a single function on :54321
curl -X POST http://127.0.0.1:54321/functions/v1/send-push \
  -H "apiKey: $SUPABASE_SECRET_KEY" -d '{"user_id":"…"}'
```

Deploy a function: `supabase functions deploy <name>`.

## Architecture

### Monorepo layout
- **Turborepo + pnpm workspaces.** `turbo.json` defines the task pipeline; `pnpm-workspace.yaml` lists `apps/*` and `packages/*`.
- All internal packages publish under the `@garden/*` scope (`@garden/web`, `@garden/mobile`, `@garden/config`, `@garden/database`, `@garden/shared`). They link via `workspace:*`.

### Type-sharing flow (single source of truth = Postgres)
1. Write a new migration in `supabase/migrations/`.
2. Apply it with `pnpm db:reset` (or `supabase migration up`).
3. Regenerate types: `pnpm db:types` rewrites `packages/database/src/types.ts`. **Never hand-edit this file.**
4. Both apps consume `import type { Database } from "@garden/database"`. Higher-level domain types and Zod validators live in `@garden/shared` and reference `Database` shapes.

If `db:types` produces a diff after a feature branch, the new generated file must be committed alongside the migration.

### Package boundaries
- `packages/database` — generated DB types + a typed `createGardenClient()` factory. Each app instantiates with its own auth-storage adapter:
  - Web: `@supabase/ssr` (cookies, set up in `apps/web/lib/supabase/`)
  - Mobile: `AsyncStorage` (set up in `apps/mobile/src/lib/supabase.ts`)
- `packages/shared` — platform-agnostic domain logic. **No DOM, no RN imports.** Modules: `schemas/` (Zod), `zone/` (frost dates), `tasks/` (cadence rules), `spacing/` (footprint/collision), `permapeople/` (catalog adapter).
- `packages/config` — shared tsconfig + eslint configs, consumed via `extends`.

### shadcn/ui is web-only
Components in `apps/web/components/ui/` are copy-pasted (not a dep) and own their code. Add new ones with `pnpm dlx shadcn@latest add <component>` from `apps/web/`. **Mobile cannot consume these** — Radix + Tailwind require the DOM. Mobile builds its own components using NativeWind (already configured in the Expo template at `apps/mobile/src/global.css`).

### Backend: Supabase + RLS as the auth model
The social model is **one-way follows** (Twitter-style, not mutual friendships — this diverges from the original `friendships(user_id_1, user_id_2, status)` table in the spec). RLS policies in `supabase/migrations/*_rls_policies.sql` are the source of truth for who can read/write what:

- `gardens` — owner always; others if `visibility = 'public'` or they follow the owner.
- `beds`, `bed_plants` — inherit visibility from owning garden.
- `posts` — author + their followers + posts attached to public gardens; hidden between blocked pairs.
- `comments`, `likes` — visible wherever the underlying post is visible; writes own-row only.
- `notifications` — own-row read/update; rows are created by security-definer triggers on follows/likes/comments inserts.
- `blocks` — own rows only; `is_blocked_pair()` is folded into posts visibility and follow inserts, and blocking severs existing follow edges both ways.
- `reports` — insert-only for clients; reads are service-role (moderation tooling).
- `tasks` — strictly own-row only.
- `follows` — readable by either party; insert/delete only by the follower.
- `plants` — public read; writes only via service-role key (i.e., the `permapeople-sync` Edge Function).
- `profiles` — rows readable by all authed users, but `zip` is excluded via **column-level grants**; new profile columns must be added to the grant list (see `20260705110000_social_core.sql` and `timezone` in `20260705130000`).

When adding tables, **always enable RLS in the same migration** and write policies before merging.

### Reminder pipeline
`generate_daily_tasks()` (PL/pgSQL; latest definition in `20260705130000_reminder_engine.sql`) runs **hourly** and computes each user's local date from `profiles.timezone` (gating on ≥ 06:00 local). It inserts water tasks on a cadence derived from `plants.water_needs` (mirrors `waterIntervalDays()` in `@garden/shared/tasks` — keep the two in sync), plus one-shot harvest and sow tasks, skipping `bed_plants.removed_at` rows and stopping water 14 days past the expected harvest. All inserts are idempotent via `ON CONFLICT` against the `(bed_plant_id, task_type, due_date)` unique constraint. A second hourly cron job calls `public.invoke_edge_function('send-push')` (pg_net HTTP POST), which sends one summary Expo push per device to users in their local 06:00 hour with pending due tasks; a third (`send-push?mode=social`, every 10 min) pushes unsent follow/like/comment notifications and stamps `notifications.pushed_at`. `send-push` also accepts `{ "user_id": "…" }` for single-user testing (per-task notifications), and prunes `device_tokens` that Expo reports as `DeviceNotRegistered`.

Mobile registers Expo push tokens into the `device_tokens` table via `apps/mobile/src/hooks/use-push-registration.ts` (requires a real EAS `projectId` in `app.json` → `extra.eas.projectId`).

**Per-environment setup (one-time):** the cron→function bridge reads two Vault secrets. Run in the SQL editor:
```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('sb_secret_...', 'secret_key');
```
Locally use `http://host.docker.internal:54321` as `project_url`. Until the secrets exist, the cron jobs fail harmlessly (see `cron.job_run_details`).

### Plant catalog syncs
Three Edge Functions upsert the public `plants` catalog nightly via pg_cron (all use the same `invoke_edge_function` Vault pattern):

| Function | Schedule (UTC) | Secrets | Paging |
|---|---|---|---|
| `permapeople-sync` | 03:00 | `PERMAPEOPLE_KEY_ID` / `PERMAPEOPLE_KEY_SECRET` | all pages in one call |
| `trefle-sync` | 03:30 | `TREFLE_TOKEN` | incremental, resumes via `sync_state` |
| `perenual-sync` | 04:00 | `PERENUAL_KEY` | incremental, resumes via `sync_state` |

The incremental syncs process ~100 s of pages per run, persist their cursor in the `sync_state` table (service-role only; RLS with no policies), and wrap back to page 1 when done. Passing `{ "page": N }` in the body overrides the cursor for manual runs.

The Permapeople transformer logic is duplicated inline from `packages/shared/src/permapeople/` because Deno can't resolve workspace packages — keep both in sync until we publish `@garden/shared` to a Deno-friendly registry.

## Deployment

- **Web → Netlify** (canonical; root `netlify.toml`). `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` must be set in the Netlify UI with the *Builds* scope. Firebase App Hosting configs were removed in June 2026 — do not re-add them.
- **Mobile → EAS** internal/TestFlight (`apps/mobile/eas.json`; profiles: development / preview / production). Before the first build: run `eas init` to replace the `REPLACE_WITH_EAS_PROJECT_ID` placeholder in `app.json`, then `eas credentials` for the APNs key / Android keystore. Build with `eas build --profile preview`. Store listings are deferred until full release.
- **Backend → Supabase** hosted project. Deploy functions with `supabase functions deploy <name>`; set function secrets (`PERMAPEOPLE_KEY_*`, `TREFLE_TOKEN`, `PERENUAL_KEY`, `ANTHROPIC_API_KEY`) in the dashboard, and create the two Vault secrets (see Reminder pipeline) once per environment.
- **CI → GitHub Actions** (`.github/workflows/ci.yml`): lint, typecheck, unit tests, build, plus a `supabase db start` + `db lint` job that proves migrations apply from scratch.

## Conventions

- **Migrations are append-only.** Once committed and applied in any environment, never edit a migration file. Add a new one.
- **All measurements in inches** (matches the spec). The bed designer, plant spacing, and bed dimensions all use inches end-to-end. Do not introduce mixed units.
- **UUIDs everywhere**, except composite PKs on `follows`. Default `gen_random_uuid()` from `pgcrypto`.
- **Dates use Postgres `date` type** for planting/frost/due_date (no timezone). Timestamps use `timestamptz`.
- **Env vars**: web uses `NEXT_PUBLIC_*` for client-readable, mobile uses `EXPO_PUBLIC_*`. Server-only (Edge Function secrets, service-role keys) never get a public prefix.

## Things easy to get wrong

- Editing `packages/database/src/types.ts` by hand — it's overwritten on `pnpm db:types`. Treat it as build output.
- Adding a shadcn component to a path mobile can also import — it won't work in RN. Web-only.
- Forgetting to enable RLS on a new table. Default-deny means the table looks empty to every authed user until policies exist.
- Two `supabase migration new` calls in the same second collide on timestamp; reorder by renaming if migration ordering matters.
- Importing from `@garden/shared` inside `supabase/functions/*` — Deno doesn't resolve workspace packages. Duplicate the logic inline, with a comment noting the source-of-truth.
- Forgetting the per-environment Vault secrets (`project_url`, `secret_key`) — every scheduled Edge Function invocation silently fails until they exist (check `cron.job_run_details`).
- Adding a `profiles` column without extending the column-level SELECT grant — the column will be invisible to clients (grants live in `20260705110000_social_core.sql`; `zip` is intentionally excluded as PII).
- Hard-deleting `bed_plants` — the designer soft-deletes via `removed_at` so planting history, photos, and task lineage survive; readers must filter `.is('removed_at', null)`.
