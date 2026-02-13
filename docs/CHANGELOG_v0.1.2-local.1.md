# Changelog: v0.1.2-local -> v0.1.2-local.1

## Summary
- Comparison range: `v0.1.2-local..v0.1.2-local.1`
- Source tag commit: `b8d4f1045c51d9e5e955866c5f0af52e50aafab9`
- Target tag commit: `ebc59c66fedb9633a83ecc750f9fe6589037f92b`
- Scope: structured modern UI refresh with light/dark parity and no MVP behavior changes.

## UI Delta
- Introduced semantic design tokens and shared `ff-*` utility classes in `index.css`.
- Refreshed app shell and control hierarchy in `App.tsx` while keeping existing test IDs stable.
- Modernized sidebar and inspector panel styling and form control consistency.
- Refined canvas/node/edge chrome visuals without changing graph behavior.
- Added manual visual QA checklist and before/after screenshot baseline set.

## QA Evidence
All gates passed in one run window:
1. `npm run doctor`
2. `npm run build`
3. `npm run test:smoke`
4. `npm run test:mvp`
5. `npm run test:mvp:onboarding`
6. `npm run test:mvp:feedback`
7. `npm run test:qa` (24 passed)

Run timestamps:
- UTC: `2026-02-13 04:40:16Z` to `2026-02-13 04:41:05Z`
- Local: `2026-02-12 23:40:16 EST` to `2026-02-12 23:41:05 EST`

## Commit Delta
1. `ebc59c6` feat(ui): apply modern fintech visual refresh

## File Delta
- `App.tsx`
- `components/FlowCanvas.tsx`
- `components/Inspector.tsx`
- `components/Sidebar.tsx`
- `index.css`
- `docs/UI_VISUAL_QA_CHECKLIST.md`
- `docs/ui-baseline/README.md`
- `docs/ui-baseline/before/*.png`
- `docs/ui-baseline/after/*.png`

## Tag Metadata
- `v0.1.2-local.1`: `2026-02-12 23:42:16 -0500` (`Local UI modern refresh release`)
