# Local MVP Launch Checklist (v0.2.4)

## Stabilization Sprint Evidence (2026-02-14)
- [x] `npm run doctor` (passed)
- [x] `npm run build` (passed)
- [x] `PW_REUSE_SERVER=1 npm run test:smoke` (passed, 8/8)
- [x] `PW_REUSE_SERVER=1 npm run test:mvp` (passed, 1/1)
- [x] `PW_REUSE_SERVER=1 npm run test:mvp:onboarding` (passed, 1/1)
- [x] `PW_REUSE_SERVER=1 npm run test:mvp:feedback` (passed, 6/6)
- [x] `PW_REUSE_SERVER=1 npm run test:qa` (passed, 66/66)
- [x] Stabilization target achieved: previously failing UI-contract specs are green.
- [ ] Hosted launch steps pending (PR/branch protection/Vercel/tag promotion).

## Local Gate Evidence
- [x] `npm run build`
- [x] `PW_PORT=4273 npx playwright test e2e/connect-human.spec.ts`
- [x] `PW_PORT=4273 npm run test:smoke`
- [x] `PW_PORT=4273 npm run test:acceptance`
- [x] `PW_PORT=4273 npm run test:a11y`

## Release Tag
- [x] Create annotated tag `v0.2.4`
- [x] Push `main` and tags to local origin
- [x] Verify `v0.2.4` exists on origin

## Local Deliverable Freeze
- [x] Generate `/Users/tarique/Downloads/banking-diagram-mvp_v0.2.4_handoff_20260213-175637.tar.gz`
- [x] Generate `/Users/tarique/Downloads/banking-diagram-mvp_v0.2.4_handoff_20260213-175637.zip`

## Optional Public Promotion (post local signoff)
- [ ] Deploy rebased `main` to hosted target
- [ ] Run smoke flow on hosted URL
- [ ] Monitor runtime errors for 24h

## MVP Storage Contract (Session-Only)
- [ ] Confirm session-only autosave behavior:
  - [ ] Refresh reload keeps the current diagram and preferences.
  - [ ] Closing the tab/browser clears the diagram (blank-first on reopen).
  - [ ] Export JSON is the durable way to keep work for now.

## Blank-First + Connect Rebuild Evidence (2026-02-15)
- [x] Default board initializes blank (`0 nodes / 0 edges`) for new workspaces.
- [x] File menu exposes explicit starter action (`toolbar-insert-starter-template`).
- [x] Reset now clears to blank canvas while preserving recovery snapshot behavior.
- [x] Select mode supports direct handle-to-handle connect; Connect tool remains sticky for chained linking.
- [x] Edge defaults persist via local preference keys:
  - `finflow-builder.edge-path-default.v1`
  - `finflow-builder.edge-style-default.v1`
- [x] `PW_REUSE_SERVER=1 npx playwright test e2e/mouse-interactions.spec.ts --repeat-each=6 --workers=1` (passed, 24/24)
- [x] `PW_REUSE_SERVER=1 npx playwright test e2e/connect-direct-select.spec.ts --workers=1` (passed, 2/2)
- [x] `PW_REUSE_SERVER=1 npm run test:qa` (passed, 77/77)

## QA Lock Evidence (2026-02-15)
- [x] Archived QA artifacts to `/Users/tarique/Documents/banking-diagram-mvp/qa-artifacts/2026-02-15T19-14-39Z-qa-lock`
- [x] `PW_REUSE_SERVER=1 npx playwright test e2e/mouse-interactions.spec.ts --repeat-each=20 --workers=1` (passed, 80/80)
- [x] Firefox sanity:
  - `e2e/smoke.spec.ts` (8/8)
  - `e2e/mvp.spec.ts` (1/1)
  - `e2e/node-properties.spec.ts` (2/2)
  - `e2e/vpe-hand-tool.spec.ts` (2/2)
- [ ] WebKit sanity fully green
  - `e2e/mvp.spec.ts` and `e2e/node-properties.spec.ts` passed
  - `e2e/smoke.spec.ts` has 1 failing case (`space drag pans the canvas viewport`)
  - `e2e/vpe-hand-tool.spec.ts` has 1 failing case (`hand tool pans canvas without holding space`)
- [x] Focused integrity/a11y drill:
  - `e2e/inspector-notes-isolation.spec.ts`
  - `e2e/diagram-migrations.spec.ts`
  - `e2e/workspace-collision.spec.ts`
  - `e2e/note-drag.spec.ts`
  - `e2e/a11y.spec.ts`
  - Result: 12/12
- [x] Mobile/theme/bottom-toolbar drill:
  - `e2e/mvp-mobile-toolbar.spec.ts`
  - `e2e/mvp-mobile-actions.spec.ts`
  - `e2e/theme-preference.spec.ts`
  - `e2e/vpe-bottom-toolbar.spec.ts`
  - Result: 6/6
- [x] Synthetic pilot evidence created: `/Users/tarique/Documents/banking-diagram-mvp/qa-artifacts/2026-02-15T19-12-32-822Z-synthetic-pilot.json` (5/5 complete)
- [x] 200-node soak evidence created: `/Users/tarique/Documents/banking-diagram-mvp/qa-artifacts/2026-02-15T19-10-50-037Z-performance-soak.json`
- [ ] Eliminate passive-listener console warnings under heavy pan/zoom before public GA
- [x] Final release gate rerun after QA updates: `npm run doctor`, `npm run build`, `PW_REUSE_SERVER=1 npm run test:qa` (84/84)

## QA Reconfirmation (2026-02-16)
- [x] Swimlane inspector management added (rename + collapse/lock/hide) and covered by `e2e/swimlane-objects.spec.ts`.
- [x] `npm run doctor` (passed)
- [x] `npm run build` (passed)
- [x] `PW_REUSE_SERVER=1 npm run test:smoke` (passed, 8/8)
- [x] `PW_REUSE_SERVER=1 npm run test:mvp` (passed, 1/1)
- [x] `PW_REUSE_SERVER=1 npm run test:mvp:onboarding` (passed, 1/1)
- [x] `PW_REUSE_SERVER=1 npm run test:mvp:feedback` (passed, 6/6)
- [x] `PW_REUSE_SERVER=1 npm run test:qa` (passed, 87/87)
- [x] Interaction flake hardening verified:
  - `PW_REUSE_SERVER=1 npx playwright test e2e/note-drag.spec.ts --workers=1 --repeat-each=5` (5/5)
  - `PW_REUSE_SERVER=1 npx playwright test e2e/smoke.spec.ts --workers=1 --repeat-each=4` (32/32)
  - `PW_REUSE_SERVER=1 npx playwright test e2e/acceptance.spec.ts -g "mobile bottom dock uses More overflow for contextual actions" --workers=1 --repeat-each=8` (8/8)
