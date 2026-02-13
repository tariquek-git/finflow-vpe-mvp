# Hosted Migration Checklist (Execute When Access Is Available)

## Target
Move from local-only release flow to hosted public release without changing MVP scope.

## Preconditions
- Hosted Git repository exists and is writable.
- Vercel project access is available.
- Local branch `main` is source-of-truth lineage.

## Git Provider Steps
1. Add hosted remote URL.
2. Push `main` and verify commit parity with local origin.
3. Push `main-legacy-2026-02-13` as rollback snapshot.
4. Keep `codex/bootstrap-ci-gate` alias until hosted policies allow cleanup.
5. Enable branch protection on `main`:
   - required check: `qa`
   - PR review required
   - disallow direct force-push to `main`

## CI Verification
1. Trigger hosted CI on `main` push.
2. Confirm `qa` passes end-to-end:
   - doctor
   - build
   - smoke
   - MVP suites
3. Confirm failing test blocks merge.

## Vercel Steps
1. Connect hosted repository to Vercel.
2. Set production branch to `main`.
3. Ensure preview deploys are enabled.
4. Set env for preview and production:
   - `VITE_ENABLE_AI=false`
   - `VITE_FEEDBACK_URL=mailto:feedback@finflow.app`
5. Deploy preview and production builds.

## Tagging Policy for Hosted Launch
- Do not use `v0.1.2` for hosted launch.
- Create hosted RC tag: `v0.1.3-public-rc1`.
- After production smoke pass, promote hosted launch tag: `v0.1.3`.

## Hosted Smoke Checklist
1. Open production URL.
2. Verify AI controls are hidden.
3. Complete flow: edit -> export -> reset -> import -> verify recovery.
4. Verify recovery status indicator updates.
5. Verify feedback link is visible and valid.
