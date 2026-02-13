import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import clsx from 'clsx';
import { useEffect } from 'react';
import { GenericBankNode } from './components/nodes/GenericBankNode';
import { SwimlaneOverlay } from './components/canvas/SwimlaneOverlay';
import { TopBar } from './components/panels/TopBar';
import { PalettePanel } from './components/panels/PalettePanel';
import { InspectorPanel } from './components/panels/InspectorPanel';
import { LaneManagerModal } from './components/panels/LaneManagerModal';
import { ToastHost } from './components/shared/ToastHost';
import { useWorkspaceController } from './features/workspace/useWorkspaceController';
import { SNAP_GRID } from './utils/factory';
import type { BankEdge, BankNode } from './types';

const nodeTypes = {
  bankNode: GenericBankNode,
};

function Workspace() {
  const {
    nodes,
    edges,
    lanes,
    ui,
    selectedNode,
    selectedEdge,
    search,
    laneModalOpen,
    toasts,
    fileInputRef,
    viewportRef,
    setSearch,
    setLaneModalOpen,
    setRfInstance,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onDrop,
    onDragOver,
    select,
    updateNode,
    resetNode,
    updateEdge,
    resetEdge,
    patchUI,
    setLaneOrientation,
    addLane,
    updateLane,
    resizeLane,
    reorderLanes,
    startNewDiagram,
    saveJson,
    openImport,
    onImport,
    loadSample,
    autoLayout,
    findNode,
    exportPng,
    exportPdfFile,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useWorkspaceController();

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (nodes.length === 0) {
        return;
      }
      event.preventDefault();
      event.returnValue = 'You have unsaved diagram changes.';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [nodes.length]);

  const backgroundVariant = ui.backgroundMode === 'grid' ? BackgroundVariant.Lines : BackgroundVariant.Dots;

  return (
    <div className={clsx('h-screen w-screen', ui.darkMode && 'dark')}>
      <div className="h-full w-full bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <TopBar
          search={search}
          backgroundMode={ui.backgroundMode}
          darkMode={ui.darkMode}
          snapToGrid={ui.snapToGrid}
          layoutDirection={ui.autoLayoutDirection}
          showSwimlanes={ui.showSwimlanes}
          showMiniMap={ui.showMiniMap}
          exportIncludeSwimlanes={ui.exportIncludeSwimlanes}
          exportIncludeBackground={ui.exportIncludeBackground}
          onSearchChange={setSearch}
          onSearch={findNode}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onNew={startNewDiagram}
          onSaveJson={saveJson}
          onImportJson={openImport}
          onLoadSample={loadSample}
          onAutoLayout={autoLayout}
          onSetLayoutDirection={(direction) => patchUI({ autoLayoutDirection: direction })}
          onExportPng={exportPng}
          onExportPdf={exportPdfFile}
          onOpenLaneManager={() => setLaneModalOpen(true)}
          onToggleSwimlanes={() => patchUI({ showSwimlanes: !ui.showSwimlanes })}
          onSetBackground={(mode) => patchUI({ backgroundMode: mode })}
          onToggleSnap={() => patchUI({ snapToGrid: !ui.snapToGrid })}
          onToggleDark={() => patchUI({ darkMode: !ui.darkMode })}
          onToggleMiniMap={() => patchUI({ showMiniMap: !ui.showMiniMap })}
          onToggleExportLanes={() => patchUI({ exportIncludeSwimlanes: !ui.exportIncludeSwimlanes })}
          onToggleExportBackground={() => patchUI({ exportIncludeBackground: !ui.exportIncludeBackground })}
        />

        <main className="grid h-[calc(100%-56px)] grid-cols-[320px_1fr_340px]">
          <PalettePanel onOpenLaneManager={() => setLaneModalOpen(true)} />

          <div ref={viewportRef} className="relative h-full w-full bg-white dark:bg-slate-900">
            <ReactFlow<BankNode, BankEdge>
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onPaneClick={() => select(null, null)}
              onNodeClick={(_, node) => select(node.id, null)}
              onEdgeClick={(_, edge) => select(null, edge.id)}
              onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) =>
                select(selectedNodes[0]?.id ?? null, selectedEdges[0]?.id ?? null)
              }
              onInit={setRfInstance}
              fitView
              panOnDrag
              zoomOnScroll
              connectionLineType={ConnectionLineType.Straight}
              snapToGrid={ui.snapToGrid}
              snapGrid={[SNAP_GRID, SNAP_GRID]}
              selectionOnDrag={false}
              selectionKeyCode="Shift"
              deleteKeyCode={null}
              proOptions={{ hideAttribution: true }}
            >
              {ui.backgroundMode !== 'none' && (
                <Background
                  variant={backgroundVariant}
                  gap={ui.backgroundMode === 'grid' ? SNAP_GRID : 22}
                  size={ui.backgroundMode === 'grid' ? 0.8 : 1.5}
                  color={ui.darkMode ? '#334155' : '#cbd5e1'}
                />
              )}

              <SwimlaneOverlay
                lanes={lanes}
                orientation={ui.laneOrientation}
                visible={ui.showSwimlanes}
                darkMode={ui.darkMode}
                onRename={(id, label) => updateLane(id, { label })}
                onResize={resizeLane}
              />

              {ui.showMiniMap && (
                <MiniMap
                  position="bottom-right"
                  nodeColor={ui.darkMode ? '#38bdf8' : '#2563eb'}
                  maskColor={ui.darkMode ? 'rgba(2,6,23,0.55)' : 'rgba(148,163,184,0.3)'}
                  pannable
                  zoomable
                />
              )}

              <Panel position="bottom-left">
                <div className="rounded-lg border border-slate-300 bg-white/95 px-2 py-1 text-[11px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-300">
                  Pan: drag blank canvas • Select: click node/edge • Multi-select: Shift + drag
                </div>
              </Panel>
            </ReactFlow>
          </div>

          <InspectorPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            nodes={nodes}
            edges={edges}
            lanes={lanes}
            onUpdateNode={updateNode}
            onResetNode={resetNode}
            onUpdateEdge={updateEdge}
            onResetEdge={resetEdge}
          />
        </main>

        <LaneManagerModal
          open={laneModalOpen}
          lanes={lanes}
          orientation={ui.laneOrientation}
          onClose={() => setLaneModalOpen(false)}
          onAddLane={addLane}
          onSetOrientation={setLaneOrientation}
          onUpdateLane={updateLane}
          onReorderLanes={reorderLanes}
        />

        <ToastHost items={toasts} />

        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={onImport} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Workspace />
    </ReactFlowProvider>
  );
}
