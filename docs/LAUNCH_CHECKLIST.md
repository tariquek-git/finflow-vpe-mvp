# Local MVP Launch Checklist

## Local Gate Evidence (v0.1.2-local.1)
- [x] `npm run doctor`
- [x] `npm run build`
- [x] `npm run test:smoke`
- [x] `npm run test:mvp`
- [x] `npm run test:mvp:onboarding`
- [x] `npm run test:mvp:feedback`
- [x] `npm run test:mvp:help-reopen`
- [x] `npm run test:mvp:mobile-toolbar`
- [x] `npm run test:qa`
- [x] Gate run timestamp (UTC): `2026-02-13 04:40:16Z` to `2026-02-13 04:41:05Z`
- [x] Gate run timestamp (local): `2026-02-12 23:40:16 EST` to `2026-02-12 23:41:05 EST`
- [x] Visual QA checklist added: `docs/UI_VISUAL_QA_CHECKLIST.md`
- [x] Before/after baseline screenshots captured: `docs/ui-baseline/`

## Local Release Tags
- [x] Baseline RC tag: `v0.1.0-mvp-rc1`
- [x] Baseline local release: `v0.1.0-local`
- [x] UX RC tag: `v0.1.1-local-ux-rc1`
- [x] UX local release: `v0.1.1-local`
- [x] Pre-launch UX RC tag: `v0.1.2-local-ux-rc1`
- [x] Pre-launch local release: `v0.1.2-local`
- [x] Modern refresh local release: `v0.1.2-local.1`

## Local Deliverable Freeze
- [x] Artifact: `release-artifacts/finflow_review-v0.1.2-local.1.tar.gz`
- [x] Checksum: `release-artifacts/finflow_review-v0.1.2-local.1.sha256`
- [x] SHA-256: `cb1eaf114b53a0c621f7228d4a4caa8b318773aa55adb4ddbb839b54c3b1f7c5`

## GitHub
- [x] Back up legacy `main` as `main-legacy-2026-02-13`
- [x] Promote `codex/bootstrap-ci-gate` lineage to `main` (remote `main` now points to `873316b`)
- [ ] Open PR to `main` (skipped due direct cutover path)
- [ ] Require `qa` branch protection on `main` (pending hosted Git provider access)
- [ ] Delete remote `codex/bootstrap-ci-gate` alias (blocked by remote push policy)

## Vercel
- [ ] Connect project to repository (pending)
- [ ] Configure production and preview deployments (pending)
- [ ] Set `VITE_ENABLE_AI=false` in hosted environments (pending)
- [ ] Deploy `v0.1.3-public-rc1` and run production smoke (pending hosted access)
- [ ] Promote `v0.1.3` public tag after production smoke (pending hosted access)

## Known Hosted Blockers
- Branch protection cannot be enforced on the local bare remote.
- Vercel deployment cannot be completed without hosted repository access.
- Remote `v0.1.2` tag already exists on unrelated history, so public launch should use `v0.1.3-public-rc1` then `v0.1.3`.

## Local Pilot Validation (Pending)
- [ ] Run 3 to 5 local user sessions.
- [ ] Fill `docs/LOCAL_PILOT_SESSION_LOG.csv`.
- [ ] Apply only high-severity first-session blockers.
- [x] Pilot runbook created: `docs/LOCAL_PILOT_RUNBOOK.md`.

## Hosted Migration Prep (Frozen)
- [x] Checklist created: `docs/HOSTED_MIGRATION_CHECKLIST.md`.
- [x] Hosted tag policy frozen to `v0.1.3-public-rc1` then `v0.1.3`.

## Local-Only Notes
- Release branch of record: `codex/ui-modern-refresh`
- Stable baseline branch: `codex/bootstrap-ci-gate`
- Local origin remains the source of truth for frozen local artifacts.
