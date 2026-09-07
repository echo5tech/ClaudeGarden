# WeGarden rebuild

## Product direction

WeGarden helps a home gardener turn a patch of space into a growing habit: plan a bed, choose plants, do the next care task, and learn from other gardeners. The default screen should answer “What needs my attention?” and provide one clear next action.

## Repository audit

The WeGarden product lives in `echo5tech/ClaudeGarden`, not a repository literally named WeGarden. Current surfaces are Next.js 16 web, Expo mobile, and Supabase. Existing useful domain work includes plant spacing, frost date calculations, reminders, RLS, and the drag-and-drop designer. The homepage is currently a plain catalog list. Navigation exposes eight equal-weight links in a small bar, overflows on phones, and the Designer link has no garden context. Backend configuration failures can occur in the proxy before the demo fallback renders. Garden creation sends unauthenticated users to a nonexistent `/login` path.

## Experience architecture

- **Today:** personal overview, next tasks, garden summaries, and clear first-garden onboarding.
- **My gardens:** visual overview, private-by-default creation, explicit bed entry points.
- **Plant library:** searchable and filterable cards, readable plant details and care information.
- **Tasks:** pending/completed views, feedback on completion, no invented live tasks.
- **Calendar:** navigable month and dated tasks; preserve planting forecasts based on saved frost/planting dates.
- **Community:** public gardens, gardener attribution, existing follow actions.
- **Bed designer:** contextual entry, usable controls, visible persistence/errors, keyboard additions alongside drag.
- **Settings / botanist:** consistent shell; retain working account and backend workflows.

## Design system

Warm ivory canvas, white paper cards, dark forest green navigation, sage surfaces, restrained clay accents. Serif display headings pair with a readable sans-serif UI. Botanical artwork is decorative, never presented as a user's actual garden photo. Use clear labels, generous spacing, consistent radii, a persistent desktop sidebar, compact mobile navigation, visible keyboard focus, and reduced-motion support. Empty, loading, failure, and success states are part of each flow.

## Implementation and release sequence

1. Rebuild the web shell and primary screens with shared UI and typed view models. Keep routes addressable and reuse authenticated Supabase data.
2. Provide an explicit, isolated `/demo` workspace so the product can be reviewed without service credentials. Demo edits are browser-local and labeled; backend failures must never silently become demo successes.
3. Repair navigation, empty states, create/task actions, and designer interactions. Preserve existing Supabase schema and native app compatibility.
4. Verify type checking, lint, shared domain tests, production build, and desktop/mobile browser flows. Record gaps rather than claiming untested hosted behavior.
5. Validate hosted sign-in, garden/bed saves, task updates, calendar, and follow operations against a staging Supabase project before production promotion.
6. Apply the same design language to Expo as a separate native implementation: mobile Today screen, task completion, garden detail, photo journal, and reminder registration. Verify on real iOS/Android hardware before store submission.

## Backend and migration policy

Keep the current Supabase schema, RLS, catalog sync, and reminder pipeline. No production data resets. Any later schema change must be an additive migration with RLS, regenerated database types, staging verification, and a migration plan. The rebuilt bed save preserves plant identities and planting dates, upserts before deleting removed placements, and retains a newly created bed ID when a later request fails. These requests still need an atomic database RPC before broader collaborative editing; a network failure can otherwise leave a partially saved bed.

## Acceptance criteria

- A new visitor understands the product and can try a clearly labeled interactive demo.
- Every primary navigation item reaches a useful screen on desktop and at 390px width.
- Search, task completion, calendar navigation, garden creation and bed design have working feedback.
- Signed-in views use real data and distinguish empty results from errors.
- Demo data and writes cannot be mistaken for a real account or sent to Supabase.
- Production checks pass; live account, native, and deployment checks are explicitly recorded if unavailable.

## Scope of this branch

This branch implements the web rebuild and replans the entire product. Native app redesign, backend replacement, real weather, push delivery, and store release require their own implementation and verification. No fabricated weather or invented production activity is shown.
