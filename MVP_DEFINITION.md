# FinFlow MVP Definition (v1)

## Goal
Enable fintech operators to model and validate a payment flow quickly with reliable save/restore behavior.

## Must-Have Outcomes
1. A user can open the starter diagram and make at least one meaningful edit.
2. A user can export their working diagram as FinFlow JSON.
3. A user can reset to starter template and then import the exported JSON to recover the edited state.
4. Core reliability checks stay green in CI (`doctor`, `build`, smoke, and MVP flow test).

## Out of Scope For MVP
- Visual polish and advanced UI/UX refinement.
- AI-generated flows in public production (feature is post-MVP).
- Multi-user collaboration or backend persistence.

## MVP Acceptance Criteria
- The happy-path flow is automated in `e2e/mvp.spec.ts`.
- First-run quick start guidance is shown and can be dismissed persistently.
- Import/recovery errors are surfaced via non-blocking in-app feedback (no blocking alert dialogs).
- CI runs the MVP flow test in the `qa` workflow.
- Import/export does not corrupt diagram structure for the tested flow.
- Public builds keep AI generation disabled by default (`VITE_ENABLE_AI=false`).
