# MVP QA Report

Date: 2026-02-13

## Automated Gate

- `npm run qa:mvp`: PASS
- `npm run qa:mvp:e2e`: PASS
- `npm run qa:mvp:pilot`: PASS
- Full validation sequence (`lint`, `test -- --run`, `build`, `qa:mvp:e2e`, `qa:mvp:pilot`): PASS

## Acceptance Status

- `A1` Create/connect nodes: PASS (E2E)
- `A2` Prevent self-loop: PASS (E2E + unit)
- `A3` Select/delete/duplicate: PASS (E2E + unit)
- `A4` Inspector immediate updates: PASS (E2E node + edge assertions)
- `A5` Edge label rules: PASS (E2E + unit)
- `A6` Swimlane toggle/orientation/rename/resize/reorder: PASS (E2E)
- `B1` Save/import round-trip: PASS (E2E + reliability test)
- `B2` Undo/redo integrity: PASS (E2E + unit)
- `B3` LocalStorage restore: PASS (E2E)
- `B4` New resets state: PASS (E2E graph + persisted UI defaults)
- `C1` PNG export swimlanes include/exclude: PASS (E2E artifact)
- `C2` PNG export background include/exclude: PASS (E2E artifact)
- `C3` PDF export full bounds: PASS (E2E artifact)
- `D1` 30-node responsiveness: PASS (reliability test)
- `D2` 75-node usability: PASS (E2E + `public/sampleDiagram.75.json`)
- `D3` Auto-layout on 75 nodes: PASS (E2E + reliability test)
- `E1` Lint: PASS
- `E2` Tests: PASS
- `E3` Build: PASS
- `E4` Full checklist execution: PASS (manual checklist reviewed and signed)

## Artifacts

- Latest E2E report: `docs/mvp-qa-e2e-report.md`
- Latest E2E JSON: `docs/mvp-qa-e2e-report.json`
- Latest E2E screenshots/downloads: `qa-artifacts/2026-02-13T03-55-26-004Z`
- Latest deep pilot summary: `qa-artifacts/deep-pilot/2026-02-13T03-55-34-487Z/deep-pilot-summary.md`
- Latest deep pilot JSON: `qa-artifacts/deep-pilot/2026-02-13T03-55-34-487Z/deep-pilot-summary.json`

## Pilot Findings (Template)

Use this section during local pilot runs. Record only `P0`/`P1` issues.

### Pilot Run

- Date: 2026-02-13
- Tester: Codex deep pilot runner
- Scenario: `Load Sample`, save/import/new lifecycle, edge inspector editability, graph-only undo, export variants, 75-node stress + repeated auto-layout, reload persistence, beforeunload lifecycle
- Build/Tag: `v0.1.2-rc1`
- Result: PASS (`PASSED=9`, `FAILED=0`)

### Issues

- No `P0` or `P1` functional blockers found in the latest deep pilot run.

### Pilot Signoff

- P0 count: 0
- P1 count: 0
- Go/No-Go: GO
- Notes: Viewport normalization after hydrate/import/sample is stable; edge and node interactions were reachable through sample/import workflows in deep pilot.

## Release Notes

- 2026-02-13: `v0.1.1` local patch release prepared (beforeunload guard, undo/redo temporal scope narrowed to nodes+edges, pinned `@xyflow/react`, hardened Vercel headers). Full gate PASS.
- 2026-02-13: `v0.1.2` local patch release prepared (deterministic post-hydrate viewport normalization + repeatable deep pilot harness). Full validation + deep pilot PASS.
