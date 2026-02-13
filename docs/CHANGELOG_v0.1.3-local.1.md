# Changelog: v0.1.3-local -> v0.1.3-local.1

## Summary
- Comparison range: `v0.1.3-local..(current working tree)`
- Scope: clarity-first premium polish sprint focused on bottom toolbar progressive disclosure and shell consistency.
- Behavior/data model/API scope: unchanged.

## UX Delta
- Refactored bottom toolbar IA into progressive disclosure:
  - Core groups always visible: `Tool`, `Insert`, `Canvas`
  - Advanced groups collapsed by default: `Arrange`, `Edge`
- Added explicit advanced disclosure controls with a11y wiring:
  - `Toggle arrange controls`
  - `Toggle edge styling controls`
  - `aria-expanded` + `aria-controls` + keyboard Enter/Space support
- Enforced readable control density and touch ergonomics:
  - 40px minimum touch targets in bottom toolbar controls
  - Improved wrapping/stability at 390px mobile viewport
  - Compact stacked advanced panels on mobile
- Preserved non-blocking toolbar shell behavior while keeping interactive controls pointer-active.

## Test Delta
- Added:
  - `e2e/vpe-bottom-toolbar.spec.ts`
- Extended:
  - `e2e/mvp-mobile-toolbar.spec.ts`
  - `e2e/a11y.spec.ts`
  - `e2e/acceptance.spec.ts`
  - `e2e/smoke.spec.ts`
- Added npm script:
  - `test:vpe:bottom-toolbar`
- Updated CI workflow:
  - `.github/workflows/qa.yml` now runs `npm run test:vpe:bottom-toolbar`

## Visual QA Artifacts
- Added toolbar baselines in `docs/ui-baseline/after/`:
  - `after-bottom-toolbar-desktop-default.png`
  - `after-bottom-toolbar-desktop-advanced.png`
  - `after-bottom-toolbar-mobile-default.png`
  - `after-bottom-toolbar-mobile-advanced.png`
- Updated `docs/UI_VISUAL_QA_CHECKLIST.md` with progressive disclosure and non-blocking shell checks.

## QA Evidence
All gates passed:
1. `npm run doctor`
2. `npm run build`
3. `npm run test:smoke`
4. `npm run test:mvp`
5. `npm run test:mvp:onboarding`
6. `npm run test:mvp:feedback`
7. `npm run test:qa` (35 passed)

Run timestamps:
- UTC: `2026-02-13 06:10:46Z` to `2026-02-13 06:12:58Z`
- Local: `2026-02-13 01:10:46 EST` to `2026-02-13 01:12:58 EST`
