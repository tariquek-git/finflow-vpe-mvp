# Local Release Handoff (v0.1.2-local)

## Release Identity
- Release branch of record: `codex/ux-polish-prelaunch`
- Local remote source of truth: `/Users/tarique/Documents/banking-diagram-mvp-origin.git`
- Local origin HEAD: `codex/bootstrap-ci-gate` (pre-cutover)
- Release tag of record: `v0.1.2-local`
- Release commit: `b8d4f1045c51d9e5e955866c5f0af52e50aafab9`
- RC tag: `v0.1.2-local-ux-rc1` (same commit as `v0.1.2-local`)

## Gate Evidence (Run Date)
- Run timestamp (UTC): `2026-02-13 03:59:07Z` to `2026-02-13 03:59:56Z`
- Run timestamp (local): `2026-02-12 22:59:07 EST` to `2026-02-12 22:59:56 EST`

All commands passed with exit code `0`:
1. `npm run doctor`
2. `npm run build`
3. `npm run test:smoke`
4. `npm run test:mvp`
5. `npm run test:mvp:onboarding`
6. `npm run test:mvp:feedback`
7. `npm run test:qa` (24 passed)

## Frozen Deliverable
- Artifact: `release-artifacts/finflow_review-v0.1.2-local.tar.gz`
- SHA-256 file: `release-artifacts/finflow_review-v0.1.2-local.sha256`
- SHA-256:
  - `f7e57428994ab2ea12ee92e91cb575d149b6e6befd6733ab8263282c03635186`

## Notes
- UX polish includes mobile toolbar clarity, quick-start Help reopen control, backup recency status copy, and expanded UX/a11y test coverage.
- Remote cutover state (`/Users/tarique/Documents/banking-diagram-mvp-origin.git`):
  - `main` now points to `685c1e75a00380578056da6b9d86baa86ca16c1d`
  - Legacy branch captured as `main-legacy-2026-02-13` at `6648ce311aed74046bedd3b832bb7d23448f37aa`
  - `codex/bootstrap-ci-gate` remains as an alias branch because remote branch deletion is blocked by policy in this environment.
- Public tagging state:
  - `v0.1.2-public-rc1` pushed to remote at `2686e602419c07148425d3df0421e0722336f849`
  - `v0.1.2` exists remotely on unrelated commit `1462ea9d1e59c737fd239b3aae789658127807f4`; overwrite is blocked by policy.
- Vercel deployment and hosted branch protection remain pending due missing hosted credentials/access.
