# Local Release Handoff (v0.2.4)

## Release Identity
- Release branch of record: `main`
- Local remote source of truth: `/Users/tarique/Documents/banking-diagram-mvp-origin.git`
- Release tag of record: `v0.2.4`
- Release type: Local patch release for UI/UX de-clutter and interaction clarity hardening

## Scope Notes
- Kept schema and import/export payload contracts unchanged (`nodes`, `edges`, `drawings`, `layout`).
- Removed duplicate `Delete/Duplicate` controls from bottom dock to avoid selector/runtime collisions.
- Preserved contextual edit actions in selection tray/overflow only.

## Gate Evidence
All commands passed with exit code `0`:
1. `npm run build`
2. `PW_PORT=4273 npx playwright test e2e/connect-human.spec.ts`
3. `PW_PORT=4273 npm run test:smoke`
4. `PW_PORT=4273 npm run test:acceptance`
5. `PW_PORT=4273 npm run test:a11y`

## QA Snapshot
- Connect-human suite: pass (7/7)
- Smoke suite: pass (7/7)
- Acceptance suite: pass (13/13)
- Accessibility suite: pass (3/3)
- Human pilot script: pass (`qa-artifacts/2026-02-13T22-55-29-913Z`)

## Deliverables
- `/Users/tarique/Downloads/banking-diagram-mvp_v0.2.4_handoff_20260213-175637.tar.gz`
- `/Users/tarique/Downloads/banking-diagram-mvp_v0.2.4_handoff_20260213-175637.zip`

## Public Contract Safety
- No changes to schema or payload contracts (`nodes`, `edges`, `drawings`, `layout`).
- No import/export JSON compatibility changes.

## Notes
- Existing QA-critical labels/test IDs remain preserved.
- `Delete selected item` remains contextual and appears only when a selection exists.
