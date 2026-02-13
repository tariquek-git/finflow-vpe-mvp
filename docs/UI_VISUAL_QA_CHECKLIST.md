# UI Visual QA Checklist (v0.1.2-local.1 candidate)

Use this checklist for manual sign-off after UI refresh. Execute in both light and dark mode.

## Desktop Checks
- [ ] Header hierarchy is clear: product identity, status chips, and actions are readable at a glance.
- [ ] Primary Actions strip clearly separates primary export action from secondary recovery actions.
- [ ] Sidebar sections are legible and scannable with clear collapsed/expanded contrast.
- [ ] Inspector forms have consistent spacing, labels, and focus visibility.
- [ ] Canvas controls remain discoverable and do not visually clash with canvas content.

## Mobile Checks
- [ ] Primary actions are visible without icon-only ambiguity.
- [ ] Toolbar controls have comfortable tap targets (>= 40px).
- [ ] Quick Start and Help remain usable on narrow screens.
- [ ] Side panels open/close smoothly without overlap artifacts.

## Light/Dark Parity
- [ ] Text contrast is strong for primary and secondary text in both modes.
- [ ] Chips and status feedback (success/warning/error/info) remain readable in both modes.
- [ ] Buttons, borders, and focus outlines are visible and consistent in both modes.
- [ ] Canvas node/edge chrome appears intentional in both modes.

## Behavioral Safety
- [ ] Core MVP flow still works end-to-end: edit -> export -> reset -> import.
- [ ] Backup status indicator updates and remains accurate after reload.
- [ ] Quick Start dismiss/reopen behavior is unchanged.
- [ ] Existing e2e selectors and accessible button names remain intact.

## Evidence
- Screenshot baselines live in `docs/ui-baseline/before/` and `docs/ui-baseline/after/`.
- Attach review notes and any UI regression findings to release handoff.
