# Local Release Handoff (v0.1.2-local)

## Release Identity
- Release branch of record: `codex/ux-polish-prelaunch`
- Local remote source of truth: `/Users/tarique/Documents/banking-diagram-mvp-origin.git`
- Local origin HEAD: `main` (post-cutover)
- Release tag of record: `v0.1.2-local`
- Release commit: `b8d4f1045c51d9e5e955866c5f0af52e50aafab9`
- RC tag: `v0.1.2-local-ux-rc1` (same commit as `v0.1.2-local`)
- Release docs snapshot commit: `873316bc64416d4b186be4139146487462b4593b`

## Gate Evidence (Run Date)
- Run timestamp (UTC): `2026-02-13 04:07:40Z` to `2026-02-13 04:08:28Z`
- Run timestamp (local): `2026-02-12 23:07:40 EST` to `2026-02-12 23:08:28 EST`

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

## Known Hosted Blockers
- Branch protection is unavailable on the local bare remote.
- Hosted deployment cannot proceed until a hosted Git provider repository is attached.
- Public `v0.1.2` cannot be reused safely; first hosted launch must use `v0.1.3-public-rc1` then `v0.1.3`.

## Local Pilot Status
- Pilot runbook prepared at `docs/LOCAL_PILOT_RUNBOOK.md`.
- Structured session log template prepared at `docs/LOCAL_PILOT_SESSION_LOG.csv`.
- Real-user pilot sessions are pending (not executed in this environment).
- No pilot-driven product fixes are present yet; no post-`v0.1.2-local` release tag was created.
