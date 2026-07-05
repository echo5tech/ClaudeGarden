# WeGarden 🌱

A cross-platform gardening app that answers three questions: **What should I plant now? How do I arrange it? How do I share it?**

- **Plan** — a drag-and-drop bed designer with to-scale spacing rings and conflict detection.
- **Grow** — water/sow/harvest reminders generated from your USDA zone, frost dates, and each plant's real cadence, pushed to your phone on your local clock.
- **Share** — a social layer: follow gardeners, post progress photos, like and comment, browse public gardens.
- **Ask** — an AI botanist chat that knows your zone, frost window, and what you're growing.

## Surfaces

| App | Stack | Highlights |
|---|---|---|
| `apps/web` | Next.js 16, Tailwind 4, shadcn/ui, dnd-kit | Bed designer, home feed, profiles, plant catalog, calendar |
| `apps/mobile` | Expo SDK 56, expo-router | Daily reminder push, camera photo journal, feed + composer |
| `supabase/` | Postgres + RLS, Edge Functions, pg_cron | Auth, social-graph row security, task generation, 3-source plant catalog sync |

## Getting started

```bash
pnpm install          # install workspace deps
pnpm db:start         # boot local Supabase (Docker required)
pnpm db:reset         # apply migrations + seed
pnpm web              # Next.js dev server on :3000
pnpm mobile           # Expo dev server
```

Copy `.env.example` into `apps/web/.env.local` and `apps/mobile/.env`, filling values from the `supabase start` output.

Quality gates: `pnpm lint && pnpm check-types && pnpm test && pnpm build`.

## Architecture

Postgres is the single source of truth. Migrations live in `supabase/migrations/`; regenerate `packages/database/src/types.ts` with `pnpm db:types` after schema changes (never hand-edit it). Domain logic (frost dates, task cadence, spacing geometry, Zod schemas) is shared across web and mobile via `@garden/shared`.

Row-level security is the authorization model — the social graph (one-way follows, block-aware visibility, own-row tasks) is enforced in the database, not in app code.

Full architecture notes, conventions, and gotchas: see [CLAUDE.md](./CLAUDE.md).

## Deployment

- **Web** → Netlify (`netlify.toml`)
- **Mobile** → EAS builds (`apps/mobile/eas.json`; run `eas init` once to set the project id)
- **Backend** → Supabase hosted project (`supabase functions deploy <name>`, secrets in the dashboard, Vault secrets for the cron bridge)
- **CI** → GitHub Actions: lint, typecheck, tests, builds, plus a from-scratch migration check
