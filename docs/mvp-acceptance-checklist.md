# MVP Acceptance Checklist

Use this checklist as the release gate for MVP.

## Core Flows

- [x] `A1` Create nodes from palette and connect with edges.
- [x] `A2` Prevent self-loop edges (`source === target`).
- [x] `A3` Select, multi-select, delete, and duplicate work as expected.
- [x] `A4` Inspector updates node and edge properties immediately.
- [x] `A5` Edge label rule works:
  - no label when `rail = Blank`
  - label shows rail text when set
  - label shows `Card Network (NetworkName)` when applicable
- [x] `A6` Swimlanes toggle, orientation switch, rename, resize, reorder.

## State Integrity

- [x] `B1` `Save JSON -> Import JSON` round-trip keeps node/edge/lane counts and UI settings.
- [x] `B2` Undo/redo restores graph state through multiple operations.
- [x] `B3` LocalStorage restore works on refresh.
- [x] `B4` `New` fully resets graph and UI state to defaults.

## Export Reliability

- [x] `C1` Export PNG works with `includeSwimlanes=true` and `false`.
- [x] `C2` Export PNG works with `includeBackground=true` and `false`.
- [x] `C3` Export PDF succeeds and contains the full diagram bounds.

## Performance and Scale

- [x] `D1` App remains responsive with `30` nodes.
- [x] `D2` App remains usable with `75` nodes and connected edges.
- [x] `D3` Auto-layout completes for large graph (`75` nodes).

## Release Criteria

- [x] `E1` `npm run lint` passes.
- [x] `E2` `npm run test -- --run` passes.
- [x] `E3` `npm run build` passes.
- [x] `E4` Manual QA pass completed using this checklist.

## Signoff

- Status: PASS
- Date: 2026-02-12
- Scope: MVP public launch gate (scope frozen)
- Evidence:
  - `docs/mvp-qa-e2e-report.md`
  - `docs/mvp-qa-e2e-report.json`
  - `docs/mvp-qa-report.md`
