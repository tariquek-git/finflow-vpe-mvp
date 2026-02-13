# MVP E2E QA Report

Date: 2026-02-13

## Results

- A0 Initial app load: PASS - Quick Help visible
- A1 Create nodes and connect edge: PASS - nodes=2 edges=1
- A2 Prevent self-loop edge: PASS
- A4N Node inspector updates node immediately: PASS
- A4E Edge inspector updates edge immediately: PASS
- A5 Edge label rules: PASS
- A3 Duplicate/delete/undo/redo flow: PASS
- A6 Lane manager edit/reorder/orientation: PASS
- B1A Save JSON download: PASS - nodes=2
- B1B Import JSON restore: PASS - nodes=2
- B3 LocalStorage restore on reload: PASS - nodes=2
- B4 New resets graph and UI defaults: PASS
- C1C2C3 PNG/PDF export toggles and output: PASS
- D1D2D3 75-node import and auto-layout: PASS - autoLayoutClickToStable~588ms

## Summary

- Passed: 14
- Failed: 0
- Artifacts: `qa-artifacts/2026-02-13T03-18-04-944Z`
