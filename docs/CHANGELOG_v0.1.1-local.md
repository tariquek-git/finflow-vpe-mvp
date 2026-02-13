# Changelog: v0.1.0-local -> v0.1.1-local

## Summary
- Comparison range: `v0.1.0-local..v0.1.1-local`
- Source tag commit: `d10c5b5270f28b1a139a5cb3e0184c39ee36776d`
- Target tag commit: `04550ef2dc810386390a53f2d2648bc0f0c81e94`
- Scope: top-3 UX blockers pass, QA expansion, and local release metadata updates.

## User-Facing UX Delta
- Added a labeled `Primary Actions` strip with always-visible text actions:
  - `Restore Backup`
  - `Reset`
  - `Import JSON`
  - `Export JSON`
- Added explicit header recovery status:
  - `Backup: Available`
  - `Backup: Not yet created`
- Added success toasts for:
  - export success
  - import success
  - reset success (backup saved)

## Test and CI Delta
- Added MVP UX tests:
  - `e2e/mvp-mobile-actions.spec.ts`
  - `e2e/mvp-recovery-status.spec.ts`
- Extended `e2e/mvp-feedback.spec.ts` with success-toast assertions.
- Added npm scripts:
  - `test:mvp:mobile-actions`
  - `test:mvp:recovery-status`
- Updated `.github/workflows/qa.yml` to run the new MVP UX tests.

## Commit Delta
1. `04550ef` feat: improve mvp ux actions, backup status, and success feedback
2. `536e882` docs: finalize local mvp release handoff and evidence
3. `073acc3` docs: add local changelog for v0.1.0-local

## File Delta
- `.github/workflows/qa.yml`
- `App.tsx`
- `docs/CHANGELOG_v0.1.0-local.md`
- `docs/LAUNCH_CHECKLIST.md`
- `docs/LOCAL_RELEASE_HANDOFF.md`
- `e2e/mvp-feedback.spec.ts`
- `e2e/mvp-mobile-actions.spec.ts`
- `e2e/mvp-recovery-status.spec.ts`
- `index.css`
- `package.json`
- `release-artifacts/finflow_review-v0.1.0-local.sha256`

## Tag Metadata
- `v0.1.1-local-ux-rc1`: 2026-02-12 22:36:00 -0500 (`Local UX release candidate`)
- `v0.1.1-local`: 2026-02-12 22:36:00 -0500 (`Local UX MVP release`)
