# Local Release Handoff (v0.1.2-local.1)

## Release Identity
- Release branch of record: `codex/ui-modern-refresh`
- Stable baseline branch: `codex/bootstrap-ci-gate`
- Local remote source of truth: `/Users/tarique/Documents/banking-diagram-mvp-origin.git`
- Local origin HEAD: `main` (post-cutover)
- Release tag of record: `v0.1.2-local.1`
- Release commit: `ebc59c66fedb9633a83ecc750f9fe6589037f92b`
- Previous local release tag: `v0.1.2-local` at `b8d4f1045c51d9e5e955866c5f0af52e50aafab9`

## Gate Evidence (Run Date)
- Run timestamp (UTC): `2026-02-13 04:40:16Z` to `2026-02-13 04:41:05Z`
- Run timestamp (local): `2026-02-12 23:40:16 EST` to `2026-02-12 23:41:05 EST`

All commands passed with exit code `0`:
1. `npm run doctor`
2. `npm run build`
3. `npm run test:smoke`
4. `npm run test:mvp`
5. `npm run test:mvp:onboarding`
6. `npm run test:mvp:feedback`
7. `npm run test:qa` (24 passed)

## Frozen Deliverable
- Artifact: `release-artifacts/finflow_review-v0.1.2-local.1.tar.gz`
- SHA-256 file: `release-artifacts/finflow_review-v0.1.2-local.1.sha256`
- SHA-256:
  - `cb1eaf114b53a0c621f7228d4a4caa8b318773aa55adb4ddbb839b54c3b1f7c5`

## UI Refresh Scope Included
- Semantic design token layer and reusable `ff-*` utility classes in `index.css`.
- Tokenized app shell/header/actions/toast styling in `App.tsx`.
- Modernized panel and control styling in `components/Sidebar.tsx` and `components/Inspector.tsx`.
- Refined node/edge chrome and canvas visuals in `components/FlowCanvas.tsx`.
- Added manual visual QA checklist and before/after screenshot evidence in `docs/ui-baseline/`.

## Notes
- MVP behavior and data model remain unchanged (no backend/API/type changes).
- Existing e2e-facing control IDs and labels remain stable.
- AI-disabled public policy remains unchanged (`VITE_ENABLE_AI=false` default for public-safe flow).

## Known Hosted Blockers
- Branch protection is unavailable on the local bare remote.
- Hosted deployment cannot proceed until a hosted Git provider repository is attached.
- Public `v0.1.2` cannot be reused safely; first hosted launch must use `v0.1.3-public-rc1` then `v0.1.3`.

## Local Pilot Status
- Pilot runbook prepared at `docs/LOCAL_PILOT_RUNBOOK.md`.
- Structured session log template prepared at `docs/LOCAL_PILOT_SESSION_LOG.csv`.
- Real-user pilot sessions are pending (not executed in this environment).
