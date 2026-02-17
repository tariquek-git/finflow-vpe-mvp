# UI Patch Gap Analysis

Date: 2026-02-15
Patch source:
- `/Users/tarique/Downloads/finflow_vpe_mvp_ui_patch.patch`
- `/Users/tarique/Downloads/finflow_vpe_mvp_ui_patch.zip`

## Summary
The incoming patch was generated from an older UI snapshot and cannot be applied directly to the current FinFlow codebase without regressions.

## What Was Safely Applied
- Added reusable UI primitives from the patch:
  - `components/ui/cn.ts`
  - `components/ui/Button.tsx`
  - `components/ui/Chip.tsx`
  - `components/ui/Menu.tsx`

## Why Direct Apply Fails
1. `TopBar` contract drift:
- Patch removes/changes currently required props and controls.
- Current code depends on existing menu/test contracts (`toolbar-file-*`, `toolbar-view-*`, `backup-status-indicator`, etc).

2. `Sidebar` contract drift:
- Patch changes props and behavior shape (overlay toggles and quickstart behavior diverge from current implementation).
- Current MVP/e2e flows expect existing search, favorites/recent behavior, and quickstart controls.

3. QA impact if blindly replaced:
- Smoke tests fail due missing controls and changed selector contracts.
- Existing keyboard/menu interaction rules regress.

## Forward-Port Plan (Next)
1. Keep current `TopBar` and `Sidebar` behavior contracts.
2. Incrementally adopt `Button`, `Chip`, and `Menu` primitives in existing components behind current test IDs.
3. Run `npm run test:smoke` after each incremental step.
4. When stable, run full `npm run test:qa`.

## Current Recommendation
Treat this patch as a style/component source, not a drop-in replacement for `TopBar.tsx` and `Sidebar.tsx`.
