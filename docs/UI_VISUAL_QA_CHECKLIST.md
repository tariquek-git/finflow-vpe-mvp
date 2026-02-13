# UI Visual QA Checklist (v0.1.2-local.1 candidate)

Use this checklist for manual sign-off after UI refresh. Execute in both light and dark mode.

## Desktop Checks
- [ ] Header and library render as detached glass floating panels (`16px` radius, blur, soft shadow).
- [ ] Header hierarchy is clear: product identity, status chips, and actions are readable at a glance.
- [ ] Primary Actions strip clearly separates primary export action from secondary recovery actions.
- [ ] Sidebar sections are legible and scannable with clear collapsed/expanded contrast.
- [ ] Inspector forms have consistent spacing, labels, and focus visibility.
- [ ] Canvas controls remain discoverable and do not visually clash with canvas content.
- [ ] Context toolbar appears above selected smart-card nodes with `Edit`, `Duplicate`, and `Delete`.

## Mobile Checks
- [ ] Primary actions are visible without icon-only ambiguity.
- [ ] Toolbar controls have comfortable tap targets (>= 40px).
- [ ] Quick Start and Help remain usable on narrow screens.
- [ ] Side panels open/close smoothly without overlap artifacts.
- [ ] Floating toolbar remains readable and unclipped at 390px viewport width.

## Light/Dark Parity
- [ ] Text contrast is strong for primary and secondary text in both modes.
- [ ] Chips and status feedback (success/warning/error/info) remain readable in both modes.
- [ ] Buttons, borders, and focus outlines are visible and consistent in both modes.
- [ ] Canvas node/edge chrome appears intentional in both modes.
- [ ] Dot-grid pattern (2px dots, 24px spacing) remains clear in both modes.

## Behavioral Safety
- [ ] Core MVP flow still works end-to-end: edit -> export -> reset -> import.
- [ ] Backup status indicator updates and remains accurate after reload.
- [ ] Quick Start dismiss/reopen behavior is unchanged.
- [ ] Existing e2e selectors and accessible button names remain intact.
- [ ] Smart alignment guides appear when nodes align on drag.
- [ ] Ctrl/Cmd + scroll zoom remains clamped between 50% and 200%.
- [ ] Active edge flow particles appear only for active flows and respect reduced motion.

## Evidence
- Screenshot baselines live in `docs/ui-baseline/before/` and `docs/ui-baseline/after/`.
- Attach review notes and any UI regression findings to release handoff.
