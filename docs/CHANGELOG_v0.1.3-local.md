# Changelog: v0.1.2-local.1 -> v0.1.3-local

## Summary
- Comparison range: `v0.1.2-local.1..v0.1.3-local`
- Source tag commit: `ebc59c66fedb9633a83ecc750f9fe6589037f92b`
- Target tag commit: `bb21b995409526d13bb69ca5cb11f236b77c3793`
- Scope: Visual Programming Environment redesign with modern canvas visuals, smart-card entities, and upgraded interaction mechanics.

## Visual System Delta
- Rebuilt semantic token layer to Slate/Indigo trust palette with dark-mode parity.
- Added floating glass panel primitives and applied them to top toolbar and left library.
- Added viewport vignette, refined action hierarchy styling, and tightened touch/focus states.
- Added smart-card node chrome (header/meta/status) for entity nodes.
- Added gradient bezier pipes and active-only flow particle animation.

## Interaction Mechanics Delta
- Updated drag snap increment to 20px.
- Added smart alignment guides (red dashed) for horizontal/vertical node alignment.
- Clamped zoom to 50%–200% for Ctrl/Cmd + scroll navigation.
- Added selected-node context toolbar (`Edit`, `Duplicate`, `Delete`).
- Added cardinal node handles visibility on selected smart-card nodes.
- Added library drag ghost preview and drop pop animation for dropped components.
- Updated inspector empty state to active `Canvas Settings`.

## Test and CI Delta
- Added:
  - `e2e/vpe-canvas-mechanics.spec.ts`
  - `e2e/vpe-node-context.spec.ts`
- Extended:
  - `e2e/mvp-mobile-toolbar.spec.ts`
  - `e2e/a11y.spec.ts`
- Added npm scripts:
  - `test:vpe:canvas-mechanics`
  - `test:vpe:node-context`
- Updated `.github/workflows/qa.yml` to run new VPE suites plus full `test:qa`.

## QA Evidence
All gates passed in one run window:
1. `npm run doctor`
2. `npm run build`
3. `npm run test:smoke`
4. `npm run test:mvp`
5. `npm run test:mvp:onboarding`
6. `npm run test:mvp:feedback`
7. `npm run test:qa` (29 passed)

Run timestamps:
- UTC: `2026-02-13 05:09:31Z` to `2026-02-13 05:10:20Z`
- Local: `2026-02-13 00:09:31 EST` to `2026-02-13 00:10:20 EST`

## Evidence Delta
- Updated `docs/UI_VISUAL_QA_CHECKLIST.md` for floating-panel/smart-card/VPE checks.
- Updated screenshot baselines in `docs/ui-baseline/after/`, including context-toolbar capture.

## Tag Metadata
- `v0.1.3-local`: `2026-02-13 00:12:28 -0500` (`Local VPE redesign release`)
