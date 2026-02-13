# Public MVP Launch Checklist

## Pre-merge
- [x] `npm run doctor`
- [x] `npm run build`
- [x] `npm run test:smoke`
- [x] `npm run test:mvp`
- [x] `npm run test:mvp:onboarding`
- [x] `npm run test:mvp:feedback`

## GitHub
- [x] Push branch `codex/bootstrap-ci-gate` (to local origin)
- [ ] Open PR to `main` (intentionally skipped for local-only release)
- [ ] Ensure `qa` is required in branch protection (intentionally skipped for local-only release)

## Vercel
- [ ] Project connected to repo (intentionally skipped for local-only release)
- [ ] Build command: `npm run build` (intentionally skipped for local-only release)
- [ ] Output directory: `dist` (intentionally skipped for local-only release)
- [ ] Production branch: `main` (intentionally skipped for local-only release)
- [ ] Preview deploys enabled for PRs (intentionally skipped for local-only release)
- [ ] `VITE_ENABLE_AI=false` for preview and production (intentionally skipped for local-only release)

## Launch
- [x] Tag release candidate `v0.1.0-mvp-rc1`
- [x] Run manual smoke on local URL (`http://127.0.0.1:3000`)
- [x] Tag and promote local release (`v0.1.0-local`)

## Local-Only Release Notes
- Release branch of record: `codex/bootstrap-ci-gate`
- Local origin default HEAD: `codex/bootstrap-ci-gate`
- Main remains untouched due to unrelated history.
