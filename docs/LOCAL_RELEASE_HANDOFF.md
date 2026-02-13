# Local Release Handoff (v0.2.3)

## Release Identity
- Release branch of record: `codex/v0.2.3-svg-export`
- Local remote source of truth: `/Users/tarique/Documents/banking-diagram-mvp-origin.git`
- Release tag of record: `v0.2.3`
- Release type: Local patch release for SVG export workflow

## Isolation Notes
- Baseline `main` was reset to `v0.2.2` before patch validation.
- SVG scope shipped from `codex/v0.2.3-svg-export` only.
- Separate non-release work preserved on `codex/wip-flowcanvas-perf`.

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
- Acceptance suite: pass (10/10)
- Accessibility suite: pass (3/3)

## Public Contract Safety
- No changes to schema or payload contracts (`nodes`, `edges`, `drawings`, `layout`).
- No import/export JSON compatibility changes.

## Notes
- Export menu now includes SVG along with JSON/PNG/PDF.
- Existing QA-critical labels/test IDs remain preserved.
