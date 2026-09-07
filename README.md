# WeGarden

A thoughtful garden companion: plan a bed, discover plants, keep up with care, and share what grows.

## Run the web app

Use Node 22+ and pnpm 9 (the version pinned in `packageManager`).

```sh
pnpm install --frozen-lockfile
pnpm web
```

Open `http://localhost:3000`. The public welcome screen and `/demo` work without Supabase credentials. The demo is explicitly labeled and keeps sample edits in the current browser; it never sends sample writes to Supabase. Clear browser storage to remove all sample drafts.

For a real account, set these in `apps/web/.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Configure the sign-in callback for your origin at `/auth/callback`. The existing Supabase migrations, RLS, catalog sync, and reminder jobs remain the backend. Follow `CLAUDE.md` for the backend and Expo setup. Never put a secret/service-role key in a public environment variable.

## Product surfaces

- `/`: welcome for visitors; Today dashboard for signed-in gardeners.
- `/gardens`: garden creation, every saved bed, new beds, and confirmed deletion.
- `/plants`: searchable plant library with filters and plant detail dialogs.
- `/tasks`: care tasks with completion, reopening, and failure feedback.
- `/calendar`: navigable care calendar plus the existing planting/harvest forecast.
- `/designer?garden=…&bed=…`: drag-and-drop bed design with keyboard additions, spacing checks, and saved layouts.
- `/explore`, `/botanist`, `/settings`: community, garden advice, and account setup.
- `/demo`: isolated interactive sample workspace.

## Verify

```sh
pnpm --filter @garden/web check-types
pnpm --filter @garden/web lint
pnpm --filter @garden/web test
pnpm --filter @garden/shared test
pnpm --filter @garden/web build
pnpm --filter @garden/web exec playwright install chromium
pnpm --filter @garden/web test:e2e
```

Browser tests launch the web app on port 3100 with no backend configured. They cover the demo, public entry, protected-route redirects, phone layouts, persistence, dialogs, and automated accessibility. To use an existing Chromium installation, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable path. Live Supabase and native device acceptance tests require those environments and are not replaced by the demo tests.

## Architecture and roadmap

`apps/web` uses Next.js 16, React 19, Tailwind 4, Base UI dialogs, and Zustand for bed design. Server-side workspace loaders and authenticated actions map the existing database to shared screen components. No schema migration is required for the web rebuild.

`apps/mobile` remains the Expo app, and `packages/shared` supplies domain calculations across platforms. Read [the rebuild plan](docs/REBUILD-PLAN.md) for product priorities, the design system, staged delivery, and release acceptance. [Verification notes](docs/VERIFICATION.md) record what was actually tested.

The dashboard's [botanical artwork](apps/web/public/art/kitchen-garden.png) was generated for this app. [Asset provenance](docs/ASSETS.md) records the prompt and use.
