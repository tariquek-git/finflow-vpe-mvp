# Public MVP Launch Checklist

## Pre-merge
- [ ] `npm run doctor`
- [ ] `npm run build`
- [ ] `npm run test:smoke`
- [ ] `npm run test:mvp`
- [ ] `npm run test:mvp:onboarding`
- [ ] `npm run test:mvp:feedback`

## GitHub
- [ ] Push branch `codex/bootstrap-ci-gate`
- [ ] Open PR to `main`
- [ ] Ensure `qa` is required in branch protection

## Vercel
- [ ] Project connected to repo
- [ ] Build command: `npm run build`
- [ ] Output directory: `dist`
- [ ] Production branch: `main`
- [ ] Preview deploys enabled for PRs
- [ ] `VITE_ENABLE_AI=false` for preview and production

## Launch
- [ ] Tag release candidate `v0.1.0-mvp-rc1`
- [ ] Run manual smoke on production URL
- [ ] Tag and promote `v0.1.0`
