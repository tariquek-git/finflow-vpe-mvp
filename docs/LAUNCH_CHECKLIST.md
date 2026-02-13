# Local MVP Launch Checklist (v0.2.2)

## Local Gate Evidence
- [x] `npm run build`
- [x] `PW_PORT=4273 npx playwright test e2e/connect-human.spec.ts`
- [x] `PW_PORT=4273 npm run test:smoke`
- [x] `PW_PORT=4273 npm run test:acceptance`
- [x] `PW_PORT=4273 npm run test:a11y`

## Release Tag
- [x] Create annotated tag `v0.2.2`
- [x] Push `main` and tags to local origin
- [x] Verify `v0.2.2` exists on origin

## Local Deliverable Freeze
- [x] Generate `/Users/tarique/Downloads/banking-diagram-mvp_v0.2.2_handoff_20260213-132726.tar.gz`
- [x] Generate `/Users/tarique/Downloads/banking-diagram-mvp_v0.2.2_handoff_20260213-132726.zip`

## Optional Public Promotion (post local signoff)
- [ ] Deploy rebased `main` to hosted target
- [ ] Run smoke flow on hosted URL
- [ ] Monitor runtime errors for 24h
