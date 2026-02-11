# MVP Acceptance Checklist

Use this checklist as the release gate for MVP.

## Core Flows

- [ ] `A1` Create nodes from palette and connect with edges.
- [ ] `A2` Prevent self-loop edges (`source === target`).
- [ ] `A3` Select, multi-select, delete, and duplicate work as expected.
- [ ] `A4` Inspector updates node and edge properties immediately.
- [ ] `A5` Edge label rule works:
  - no label when `rail = Blank`
  - label shows rail text when set
  - label shows `Card Network (NetworkName)` when applicable
- [ ] `A6` Swimlanes toggle, orientation switch, rename, resize, reorder.

## State Integrity

- [ ] `B1` `Save JSON -> Import JSON` round-trip keeps node/edge/lane counts and UI settings.
- [ ] `B2` Undo/redo restores graph state through multiple operations.
- [ ] `B3` LocalStorage restore works on refresh.
- [ ] `B4` `New` fully resets graph and UI state to defaults.

## Export Reliability

- [ ] `C1` Export PNG works with `includeSwimlanes=true` and `false`.
- [ ] `C2` Export PNG works with `includeBackground=true` and `false`.
- [ ] `C3` Export PDF succeeds and contains the full diagram bounds.

## Performance and Scale

- [ ] `D1` App remains responsive with `30` nodes.
- [ ] `D2` App remains usable with `75` nodes and connected edges.
- [ ] `D3` Auto-layout completes for large graph (`75` nodes).

## Release Criteria

- [ ] `E1` `npm run lint` passes.
- [ ] `E2` `npm run test -- --run` passes.
- [ ] `E3` `npm run build` passes.
- [ ] `E4` Manual QA pass completed using this checklist.
