# FinFlow MVP Definition (v1)

## Goal
Enable fintech operators to model and validate a payment flow quickly with a reliable **session-only** editor (autosave while the tab is open).

## Must-Have Outcomes
1. A user can start from a blank canvas and optionally insert the starter template.
2. A user can make at least one meaningful edit (nodes/edges or node properties).
3. A user can export their working diagram as FinFlow JSON (the only durable way to keep work during MVP).
4. A user can reset to a blank canvas and then import the exported JSON to recover the edited state.
5. Session-only autosave works: refresh keeps the diagram; closing the tab/browser clears it (unless exported).
6. Core reliability checks stay green in CI (`doctor`, `build`, smoke, and MVP flow test).

## Out of Scope For MVP
- Major redesign and broad UI/UX refactors.
- AI-generated flows in public production (feature is post-MVP).
- Persistent storage across browser restarts (cloud or localStorage) and multi-user collaboration.

## MVP Acceptance Criteria
- The happy-path flow is automated in `e2e/mvp.spec.ts`.
- First-run quick start guidance is shown and can be dismissed for the current browser session.
- Import/recovery errors are surfaced via non-blocking in-app feedback (no blocking alert dialogs).
- CI runs the MVP flow test in the `qa` workflow.
- Import/export does not corrupt diagram structure for the tested flow.
- Public builds keep AI generation disabled by default (`VITE_ENABLE_AI=false`).
