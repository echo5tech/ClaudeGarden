# Go-live checklist

Everything the codebase can't do for itself. Work top to bottom; the first
section unblocks TestFlight/internal testing, the second is for GA.

## 1. User-testing readiness

### Supabase (hosted project)
- [ ] Create the project, then `supabase link` and `supabase db push` (applies all migrations).
- [ ] Run `pnpm db:types` against the project and confirm `packages/database/src/types.ts` has **zero diff** (portions were hand-written in an environment without Docker).
- [ ] Verify the pgTAP suite passed in CI (`supabase test db` in the db job).
- [ ] Create the Vault secrets (SQL editor):
      `select vault.create_secret('https://<ref>.supabase.co', 'project_url');`
      `select vault.create_secret('sb_secret_...', 'secret_key');`
- [ ] Deploy the functions: `supabase functions deploy send-push permapeople-sync trefle-sync perenual-sync botanist-chat`.
- [ ] Set function secrets in the dashboard: `PERMAPEOPLE_KEY_ID/SECRET`, `TREFLE_TOKEN`, `PERENUAL_KEY`, `ANTHROPIC_API_KEY`.
- [ ] Auth → URL configuration: set the **Site URL** to the production web origin and add `https://<web-origin>/auth/callback` to redirect URLs (password-reset emails depend on this).
- [ ] After 24 h, check `select * from cron.job_run_details order by start_time desc;` — all seven jobs green. Cron failures are silent otherwise.
- [ ] Enable Point-in-Time Recovery (or confirm daily backups) on the database.

### Web (Netlify)
- [ ] Env vars (Builds scope): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, plus `NEXT_PUBLIC_SITE_URL` (used by sitemap/robots).
- [ ] Observability keys: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `NEXT_PUBLIC_POSTHOG_KEY` (all optional — everything no-ops without them, but testing without them is flying blind).

### Mobile (EAS)
- [ ] `eas init` — replaces `REPLACE_WITH_EAS_PROJECT_ID` in `app.json`. Push registration is dormant until this exists.
- [ ] `eas credentials` — APNs key (iOS) and keystore (Android).
- [ ] Env for builds: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_WEB_URL`, and optionally `EXPO_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_POSTHOG_KEY`.
- [ ] **Replace the starter artwork**: `assets/images/icon.png`, `splash-icon.png`, and the Android adaptive icons are still Expo defaults. The splash background is already garden-green.
- [ ] `eas build --profile preview` → install on a device → verify: sign-in, push permission prompt, a reminder notification tap lands on Tasks, photo upload renders in the Journal.
- [ ] Consider `expo-updates` (EAS Update) so JS fixes reach testers without full rebuilds.

### Process
- [ ] Check `reports` daily while testing (see `docs/MODERATION.md`).
- [ ] Flip the CI `edge-functions` job from advisory (`continue-on-error`) to blocking once it has run green.

## 2. GA readiness

- [ ] App Store / Play listings: screenshots, descriptions, privacy questionnaire (data linked to identity: email, UGC, coarse location via zip/zone), UGC review notes pointing at report/block/takedown features.
- [ ] Age rating questionnaire (UGC → typically 12+/Teen).
- [ ] Custom SMTP for auth emails (Supabase's built-in sender has strict rate limits) and branded email templates.
- [ ] Domain: point `NEXT_PUBLIC_SITE_URL` / `EXPO_PUBLIC_WEB_URL` at the real domain; regenerate the reset-email redirect config to match.
- [ ] Supabase image transformations (paid plan) for feed thumbnails, or add a resize step at upload for web posts.
- [ ] Load-test the feed and sync crons against a realistic catalog (Trefle/Perenual full syncs take multiple nightly runs to complete the first pass).
- [ ] Playwright E2E smoke (signup → garden → place plant → save → post → like) wired to a preview deploy.
- [ ] Legal review of `/terms` and `/privacy` (current copies are solid drafts, not counsel-reviewed).
- [ ] Rotate any keys that were ever committed to CI logs or shared channels.
