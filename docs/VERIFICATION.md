# Rebuild verification

Verified locally on September 6, 2026 with Node 22.23.2 and pnpm 9.0.0. The web preview uses the production build on port 3101.

## Passed

- `pnpm check-types`: web, mobile, shared domain code, and database types.
- `pnpm lint`: all configured workspace lint tasks.
- `pnpm test`: 38 tests; 33 existing shared domain tests and 5 bed persistence regression tests.
- `pnpm build`: optimized Next.js production build.
- Playwright against the production server: all 9 browser scenarios passed using Chromium. Covered public entry and protected redirects, unavailable account configuration, unknown demo routes, plant search and dialogs, task completion/reopening, garden creation, keyboard bed additions and save/reload, calendar navigation, mobile navigation at 390px, every demo destination, corrupted storage recovery, and confirmed garden deletion.
- The dashboard's axe scan reported no violations for the selected WCAG 2 A/AA and 2.1 AA rules. This automated check is limited to the dashboard and does not establish complete accessibility conformance.
- Desktop (1440px) and mobile (390px) screenshots were inspected. Mobile navigation was checked for keyboard focus handling, dismissal, and horizontal overflow.
- `git diff --check`: no whitespace errors.

The bed persistence regression tests use a mocked Supabase client. They check stable plant IDs and dates, failed-upsert behavior and retryable bed identity, deletion of only removed placements after successful upsert, overlap prevention, and bed resize bounds. They do not establish live database behavior.

## Release work still required

- Exercise live sign-in/callback, garden creation/deletion, bed saves, task updates, profiles, follows, and botanist responses against staging Supabase with real user sessions. No service credentials or live account were available for this run.
- Apply and lint the existing database migrations in a local/staging Supabase environment. The existing CI database gate remains in place; it was not run locally. This branch has no database schema changes.
- Verify the native Expo experience on iOS/Android. Its existing code passed type checks and lint, but its screens have not been redesigned in this branch.
- Verify the canonical Netlify deployment before production promotion. This work has not been merged or deployed. Check the pull request for GitHub CI results; local results above are independent of remote CI.

## Known implementation limits

Bed saving uses multiple requests. IDs and dates are preserved and destructive steps follow successful upsert, but partial saves remain possible on network failure; an atomic database RPC is planned. The live workspace fetches up to 500 plants and 500 tasks; a larger catalog/history needs pagination. Demo edits persist only in the current browser, and the demo supports one editable bed per sample garden. Calendar day boundaries follow the runtime date; a profile timezone is a future enhancement.

## Reproduce browser checks

```sh
pnpm --filter @garden/web exec playwright install chromium
pnpm --filter @garden/web test:e2e
```

The default test command starts a development server on port 3100 with the public Supabase variables empty. To test an already running build, set `PLAYWRIGHT_BASE_URL` to its URL. Optional `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an existing browser executable. Tests make no live backend writes.
