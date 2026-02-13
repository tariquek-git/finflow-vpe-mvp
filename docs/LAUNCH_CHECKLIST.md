# Local MVP Launch Checklist

## Local Gate Evidence (v0.1.1-local)
- [x] `npm run doctor`
- [x] `npm run build`
- [x] `npm run test:smoke`
- [x] `npm run test:mvp`
- [x] `npm run test:mvp:onboarding`
- [x] `npm run test:mvp:feedback`
- [x] `npm run test:qa`
- [x] Gate run timestamp (UTC): `2026-02-13 03:37:15Z` to `2026-02-13 03:37:50Z`
- [x] Gate run timestamp (local): `2026-02-12 22:37:15 EST` to `2026-02-12 22:37:50 EST`

## Local Release Tags
- [x] Baseline RC tag: `v0.1.0-mvp-rc1`
- [x] Baseline local release: `v0.1.0-local`
- [x] UX RC tag: `v0.1.1-local-ux-rc1`
- [x] UX local release: `v0.1.1-local`

## Local Deliverable Freeze
- [x] Artifact: `release-artifacts/finflow_review-v0.1.1-local.tar.gz`
- [x] Checksum: `release-artifacts/finflow_review-v0.1.1-local.sha256`
- [x] SHA-256: `15ca1e6d6daa3591717aa30c2479d702febdfa401e8930bef88c8ef4b59f9ad3`

## GitHub (Intentionally Skipped: local-only)
- [ ] Open PR to `main`
- [ ] Require `qa` branch protection on `main`

## Vercel (Intentionally Skipped: local-only)
- [ ] Connect project to repository
- [ ] Configure production and preview deployments
- [ ] Set `VITE_ENABLE_AI=false` in hosted environments

## Local-Only Notes
- Release branch of record: `codex/bootstrap-ci-gate`
- Local origin default HEAD: `codex/bootstrap-ci-gate`
- `main` remains untouched due to unrelated history.
- Public-hosted deployment is intentionally out of scope for this release flow.
