# MVP QA Report

Date: 2026-02-12

## Automated Gate

- `npm run qa:mvp`: PASS
- `npm run qa:mvp:e2e`: PASS
- `npm run qa:mvp:full`: PASS

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
- Latest screenshots/downloads: `qa-artifacts/2026-02-13T03-18-04-944Z`

## Pilot Findings (Template)

Use this section during local pilot runs. Record only `P0`/`P1` issues.

### Pilot Run

- Date:
- Tester:
- Scenario:
- Build/Tag: `v0.1.0-qa.1`
- Result: PASS / FAIL

### Issues

Copy this block for each issue:

```md
- ID:
- Priority: P0 / P1
- Area: (A1-A6, B1-B4, C1-C3, D1-D3)
- Steps to Reproduce:
  1.
  2.
  3.
- Expected:
- Actual:
- Evidence: (screenshot path or artifact file)
- Status: Open / Fixed / Verified
```

### Pilot Signoff

- P0 count:
- P1 count:
- Go/No-Go:
- Notes:

## Release Notes

- 2026-02-13: `v0.1.1` local patch release prepared (beforeunload guard, undo/redo temporal scope narrowed to nodes+edges, pinned `@xyflow/react`, hardened Vercel headers). Full gate PASS.
