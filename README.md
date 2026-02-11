# Banking Diagram MVP

Clean MVP web app for banking flow-of-funds and settlement diagrams.

## Stack

- React + TypeScript + Vite
- React Flow
- Zustand
- zundo (undo/redo middleware)
- Tailwind CSS
- zod runtime schema validation
- dagre auto-layout engine
- LocalStorage persistence
- PNG/PDF export (html-to-image + jsPDF)

## Run

```bash
npm install
npm run dev
```

Open: `http://127.0.0.1:5173`

## Build

```bash
npm run build
```

## Test

```bash
npm run test
```

## MVP QA

- Acceptance checklist: `docs/mvp-acceptance-checklist.md`
- Latest QA report: `docs/mvp-qa-report.md`
- High-scale sample for stress QA: `public/sampleDiagram.75.json`

Run the release gate:

```bash
npm run qa:mvp
```

Run browser QA:

```bash
npm run qa:mvp:e2e
```

Run full gate + browser QA:

```bash
npm run qa:mvp:full
```

## MVP Features

- Top bar actions: New, Save JSON, Import JSON, Load Sample, Export PNG/PDF
- Auto layout action (Dagre, with LR/TB direction toggle)
- Toggles: Swimlanes, Background (grid/dots/none), Snap, Dark mode, MiniMap
- Left palette with 18 banking node types grouped by category
- Drag from palette to canvas to create nodes
- Connect nodes via handles (left/right/top/bottom)
- Straight edges with rail label rules
- Right inspector for node/edge properties
- Quick help + stats when nothing selected
- Swimlanes overlay (horizontal/vertical), inline rename, resize handles
- Swimlane manager modal with drag-and-drop reorder
- Search by `displayName` and viewport focus
- Keyboard shortcuts:
  - Delete / Backspace: remove selection
  - Cmd/Ctrl + D: duplicate selected nodes
  - Cmd/Ctrl + Z: undo
  - Cmd/Ctrl + Shift + Z or Ctrl + Y: redo
- Debounced autosave to localStorage
- JSON import/export with minimal schema normalization
- Sample diagram (`public/sampleDiagram.json`)

## Project Layout

```text
src/
  components/
    canvas/SwimlaneOverlay.tsx
    nodes/GenericBankNode.tsx
    panels/TopBar.tsx
    panels/PalettePanel.tsx
    panels/InspectorPanel.tsx
    panels/LaneManagerModal.tsx
    shared/ToastHost.tsx
  features/workspace/
    useWorkspaceController.ts
    useDiagramPersistence.ts
    useKeyboardShortcuts.ts
    useToastQueue.ts
  data/schema.ts
  store/useDiagramStore.ts
  store/useDiagramStore.test.ts
  utils/factory.ts
  utils/io.ts
  utils/exporters.ts
  types.ts
  App.tsx
  styles.css
public/
  sampleDiagram.json
```
