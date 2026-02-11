# Banking Diagram MVP (Codex Handoff)

This repo is a frontend-only MVP (React + TypeScript + Vite) for a banking flow-of-funds / settlement diagram tool.

## Quick Start (Another Computer)

### Prereqs
- Node.js 20+ recommended (Node 18 should work, but use 20+ for fewer surprises)
- npm (comes with Node)

### Run Dev Server
```bash
git clone <REPO_URL>
cd <REPO_FOLDER>
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

### Build + QA
```bash
npm run qa:mvp:full
```

### E2E (optional, takes longer)
```bash
npm run qa:mvp:e2e
```
Note: Playwright may download browsers on first run.

## What’s In Here
- Canvas: React Flow nodes/edges + drag-drop palette
- State: Zustand + localStorage persistence
- Swimlanes: overlay (not nodes), toggle, rename, resize, reorder
- Import/Export: JSON + PNG/PDF

## Troubleshooting

### Browser shows “localhost refused to connect”
That means the dev server is not running (or running on a different port).
1. Confirm `npm run dev` is running in a terminal and did not error.
2. Use the exact URL printed by Vite (it can be `5173`, `5174`, etc.).

### Port already in use
Stop the process using the port, or let Vite pick another port and use the new URL it prints.

## Codex Notes (for an assistant)
- Repo is frontend-only, no backend.
- Keep the MVP reliable: avoid heavy validations; prefer warnings/toasts.
- Performance target: ~30-75 nodes smooth.
- If you change UI/UX, keep progressive disclosure (don’t permanently show every tool/panel).

