# Local Release Handoff (v0.1.3-local)

## Release Identity
- Release branch of record: `codex/vpe-interaction-mechanics`
- Phase-1 foundation branch: `codex/vpe-foundation-visual`
- Stable baseline branch: `codex/ui-modern-refresh`
- Local remote source of truth: `/Users/tarique/Documents/banking-diagram-mvp-origin.git`
- Local origin HEAD: `main` (post-cutover)
- Release tag of record: `v0.1.3-local`
- Release commit: `bb21b995409526d13bb69ca5cb11f236b77c3793`
- Previous local release tag: `v0.1.2-local.1` at `ebc59c66fedb9633a83ecc750f9fe6589037f92b`

## Gate Evidence (Run Date)
- Run timestamp (UTC): `2026-02-13 05:09:31Z` to `2026-02-13 05:10:20Z`
- Run timestamp (local): `2026-02-13 00:09:31 EST` to `2026-02-13 00:10:20 EST`

All commands passed with exit code `0`:
1. `npm run doctor`
2. `npm run build`
3. `npm run test:smoke`
4. `npm run test:mvp`
5. `npm run test:mvp:onboarding`
6. `npm run test:mvp:feedback`
7. `npm run test:qa` (29 passed)

## Frozen Deliverable
- Artifact: `release-artifacts/finflow_review-v0.1.3-local.tar.gz`
- SHA-256 file: `release-artifacts/finflow_review-v0.1.3-local.sha256`
- SHA-256:
  - `c81ff4789d63499f688abaa62f25036083eb425b2a7ae88235622d97a0c1dd49`

## VPE Scope Included
- Infinite Slate-50 canvas with technical dot-grid (2px dots, 24px spacing).
- Detached glass floating top toolbar and left library panel.
- Smart-card entity nodes with bento-style header/meta/status layout.
- Gradient bezier data pipes with active-only flow particle animation.
- Node selection context toolbar and cardinal connection handles.
- 20px snap grid, red smart alignment guides, and 50–200% zoom clamp.
- Inspector empty state upgraded to actionable `Canvas Settings`.
- Drag ghost preview and drop spring animation for library placements.

## Notes
- MVP behavior and data model remain unchanged (no backend/API/type changes).
- Existing e2e-facing control IDs and labels remain stable.
- AI-disabled public policy remains unchanged (`VITE_ENABLE_AI=false` default for public-safe flow).
- Visual QA evidence refreshed in `docs/ui-baseline/after/`.

## Known Hosted Blockers
- Branch protection is unavailable on the local bare remote.
- Hosted deployment cannot proceed until a hosted Git provider repository is attached.
- Public `v0.1.2` cannot be reused safely; first hosted launch must use `v0.1.3-public-rc1` then `v0.1.3`.

## Local Pilot Status
- Pilot runbook prepared at `docs/LOCAL_PILOT_RUNBOOK.md`.
- Structured session log template prepared at `docs/LOCAL_PILOT_SESSION_LOG.csv`.
- Real-user pilot sessions are pending (not executed in this environment).

## Premium Polish Sprint Update (v0.1.3-local.1 candidate)
- Working branch: `codex/ui-premium-polish-sprint`
- Base branch: `codex/vpe-interaction-mechanics`
- Scope: clarity-first bottom toolbar IA polish + shell consistency (no behavior/API/storage changes)

### QA Evidence (Premium Polish)
- Run timestamp (UTC): `2026-02-13 06:10:46Z` to `2026-02-13 06:12:58Z`
- Run timestamp (local): `2026-02-13 01:10:46 EST` to `2026-02-13 01:12:58 EST`

All required commands passed with exit code `0`:
1. `npm run doctor`
2. `npm run build`
3. `npm run test:smoke`
4. `npm run test:mvp`
5. `npm run test:mvp:onboarding`
6. `npm run test:mvp:feedback`
7. `npm run test:qa` (35 passed)

### Visual Sign-off Notes (Premium Polish)
- Bottom toolbar now defaults to core controls (`Tool`, `Insert`, `Canvas`) with progressive disclosure for advanced groups (`Arrange`, `Edge`).
- Disclosure controls are keyboard operable and expose correct `aria-expanded`/`aria-controls` state.
- Mobile 390px toolbar no longer clips advanced labels; stacked advanced panels render cleanly.
- Canvas hit-testing remains available outside interactive toolbar controls.
- New baselines captured in `docs/ui-baseline/after/`:
  - `after-bottom-toolbar-desktop-default.png`
  - `after-bottom-toolbar-desktop-advanced.png`
  - `after-bottom-toolbar-mobile-default.png`
  - `after-bottom-toolbar-mobile-advanced.png`
