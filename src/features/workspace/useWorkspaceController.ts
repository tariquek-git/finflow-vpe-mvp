import type { OnConnect, ReactFlowInstance } from '@xyflow/react';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { NODE_TYPES, type BankEdge, type BankNode, type DiagramPayload, type NodeType } from '../../types';
import { downloadJson, normalizePayload, parseJsonFile } from '../../utils/io';
import { applyDagreLayout } from '../../utils/layout';
import { useDiagramStore } from '../../store/useDiagramStore';
import { useDiagramPersistence } from './useDiagramPersistence';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useToastQueue } from './useToastQueue';

export function useWorkspaceController() {
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const lanes = useDiagramStore((state) => state.lanes);
  const ui = useDiagramStore((state) => state.ui);
  const selectedNodeId = useDiagramStore((state) => state.selectedNodeId);
  const selectedEdgeId = useDiagramStore((state) => state.selectedEdgeId);

  const setNodes = useDiagramStore((state) => state.setNodes);
  const onNodesChange = useDiagramStore((state) => state.onNodesChange);
  const onEdgesChange = useDiagramStore((state) => state.onEdgesChange);
  const addNode = useDiagramStore((state) => state.addNode);
  const addConnection = useDiagramStore((state) => state.addConnection);
  const select = useDiagramStore((state) => state.select);
  const updateNode = useDiagramStore((state) => state.updateNode);
  const resetNode = useDiagramStore((state) => state.resetNode);
  const updateEdge = useDiagramStore((state) => state.updateEdge);
  const resetEdge = useDiagramStore((state) => state.resetEdge);
  const deleteSelection = useDiagramStore((state) => state.deleteSelection);
  const duplicateSelection = useDiagramStore((state) => state.duplicateSelection);
  const patchUI = useDiagramStore((state) => state.patchUI);
  const setLaneOrientation = useDiagramStore((state) => state.setLaneOrientation);
  const addLane = useDiagramStore((state) => state.addLane);
  const updateLane = useDiagramStore((state) => state.updateLane);
  const resizeLane = useDiagramStore((state) => state.resizeLane);
  const reorderLanes = useDiagramStore((state) => state.reorderLanes);
  const newDiagram = useDiagramStore((state) => state.newDiagram);
  const hydrate = useDiagramStore((state) => state.hydrate);
  const exportPayload = useDiagramStore((state) => state.exportPayload);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) ?? null, [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => edges.find((edge) => edge.id === selectedEdgeId) ?? null, [edges, selectedEdgeId]);

  const [search, setSearch] = useState('');
  const [laneModalOpen, setLaneModalOpen] = useState(false);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance<BankNode, BankEdge> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pendingViewportNormalizationRef = useRef(false);
  const pendingViewportNodeIdsRef = useRef<string[] | null>(null);
  const viewportNormalizationRunIdRef = useRef(0);
  const { toasts, pushToast } = useToastQueue();
  const history = useDiagramStore.temporal.getState();
  const canUndo = history.pastStates.length > 0;
  const canRedo = history.futureStates.length > 0;

  useDiagramPersistence({ nodes, edges, lanes, ui, hydrate, exportPayload });

  const clearHistory = useCallback(() => {
    useDiagramStore.temporal.getState().clear();
  }, []);

  const runViewportNormalization = useCallback(
    async (nodeIds?: string[] | null, runId?: number) => {
      if (!rfInstance) {
        return;
      }

      const expectedRunId = runId ?? viewportNormalizationRunIdRef.current;
      const targetNodeIds = nodeIds?.length ? [...nodeIds] : null;
      const frame = () =>
        new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve());
        });
      const hasStableMeasurements = () => {
        const currentNodes = rfInstance.getNodes();
        if (!currentNodes.length) {
          return false;
        }

        const trackedNodes = targetNodeIds?.length
          ? currentNodes.filter((node) => targetNodeIds.includes(node.id))
          : currentNodes;
        if (!trackedNodes.length) {
          return false;
        }

        if (targetNodeIds?.length && trackedNodes.length !== targetNodeIds.length) {
          return false;
        }

        return trackedNodes.every(
          (node) => (node.measured?.width ?? node.width ?? 0) > 0 && (node.measured?.height ?? node.height ?? 0) > 0,
        );
      };

      for (let attempt = 0; attempt < 12; attempt += 1) {
        if (viewportNormalizationRunIdRef.current !== expectedRunId) {
          return;
        }
        if (hasStableMeasurements()) {
          break;
        }
        await frame();
      }

      if (viewportNormalizationRunIdRef.current !== expectedRunId) {
        return;
      }

      const fitOptions = {
        nodes: targetNodeIds?.map((id) => ({ id })),
        padding: 0.35,
        maxZoom: 1.1,
        duration: 260,
        includeHiddenNodes: false,
      };
      await rfInstance.fitView(fitOptions);
      await frame();
      if (viewportNormalizationRunIdRef.current !== expectedRunId) {
        return;
      }

      await rfInstance.fitView({ ...fitOptions, duration: 0 });
      if (viewportNormalizationRunIdRef.current === expectedRunId) {
        pendingViewportNodeIdsRef.current = null;
      }
    },
    [rfInstance],
  );

  const normalizeViewportAfterHydrate = useCallback((nodeIds?: string[]) => {
    pendingViewportNormalizationRef.current = true;
    pendingViewportNodeIdsRef.current = nodeIds ?? null;
    viewportNormalizationRunIdRef.current += 1;
    void runViewportNormalization(nodeIds, viewportNormalizationRunIdRef.current);
  }, [runViewportNormalization]);

  useEffect(() => {
    if (!rfInstance || !pendingViewportNormalizationRef.current || nodes.length === 0) {
      return;
    }
    pendingViewportNormalizationRef.current = false;
    viewportNormalizationRunIdRef.current += 1;
    void runViewportNormalization(pendingViewportNodeIdsRef.current, viewportNormalizationRunIdRef.current);
    pendingViewportNodeIdsRef.current = null;
  }, [nodes.length, rfInstance, runViewportNormalization]);

  const undo = useCallback(() => {
    useDiagramStore.temporal.getState().undo();
    select(null, null);
  }, [select]);

  const redo = useCallback(() => {
    useDiagramStore.temporal.getState().redo();
    select(null, null);
  }, [select]);

  useKeyboardShortcuts({ deleteSelection, duplicateSelection, undo, redo });

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      if (!rfInstance) {
        return;
      }

      const rawType = event.dataTransfer.getData('application/x-node-type');
      if (!NODE_TYPES.includes(rawType as NodeType)) {
        return;
      }

      const point = rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      addNode(rawType as NodeType, point);
    },
    [addNode, rfInstance],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      addConnection(connection);
    },
    [addConnection],
  );

  const findNode = useCallback(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return;
    }

    const found = nodes.find((node) => node.data.displayName.toLowerCase().includes(term));
    if (!found || !rfInstance) {
      pushToast('No matching node found', 'error');
      return;
    }

    setNodes((current) => current.map((node) => ({ ...node, selected: node.id === found.id })));
    select(found.id, null);
    rfInstance.fitView({ nodes: [{ id: found.id }], padding: 0.7, maxZoom: 1.4, duration: 280 });
  }, [nodes, pushToast, rfInstance, search, select, setNodes]);

  const saveJson = useCallback(() => {
    downloadJson(exportPayload());
    pushToast('JSON exported', 'success');
  }, [exportPayload, pushToast]);

  const openImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onImport = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      const payload = await parseJsonFile(file);
      if (!payload) {
        pushToast('Import failed: invalid schema', 'error');
      } else {
        hydrate(payload);
        clearHistory();
        normalizeViewportAfterHydrate(payload.nodes.map((node) => node.id));
        pushToast('Diagram imported', 'success');
      }

      event.target.value = '';
    },
    [clearHistory, hydrate, normalizeViewportAfterHydrate, pushToast],
  );

  const loadSample = useCallback(async () => {
    try {
      const response = await fetch('/sampleDiagram.json');
      const json = (await response.json()) as DiagramPayload;
      const payload = normalizePayload(json);
      if (!payload) {
        pushToast('Sample is invalid', 'error');
        return;
      }
      hydrate(payload);
      clearHistory();
      normalizeViewportAfterHydrate(payload.nodes.map((node) => node.id));
      pushToast('Sample loaded', 'success');
    } catch {
      pushToast('Sample load failed', 'error');
    }
  }, [clearHistory, hydrate, normalizeViewportAfterHydrate, pushToast]);

  const currentViewport = useCallback(
    (): HTMLElement | null => viewportRef.current?.querySelector('.react-flow__viewport') as HTMLElement | null,
    [],
  );

  const exportPng = useCallback(async () => {
    const viewport = currentViewport();
    if (!viewport) {
      pushToast('Canvas unavailable for export', 'error');
      return;
    }

    try {
      const { captureDiagramPng, downloadPng } = await import('../../utils/exporters');
      const png = await captureDiagramPng({
        nodes,
        viewport,
        includeSwimlanes: ui.exportIncludeSwimlanes,
        includeBackground: ui.exportIncludeBackground,
        darkMode: ui.darkMode,
      });
      downloadPng(png.dataUrl);
      pushToast('PNG exported', 'success');
    } catch {
      pushToast('PNG export failed', 'error');
    }
  }, [currentViewport, nodes, pushToast, ui.darkMode, ui.exportIncludeBackground, ui.exportIncludeSwimlanes]);

  const exportPdfFile = useCallback(async () => {
    const viewport = currentViewport();
    if (!viewport) {
      pushToast('Canvas unavailable for export', 'error');
      return;
    }

    try {
      const { exportPdf } = await import('../../utils/exporters');
      await exportPdf({
        nodes,
        viewport,
        includeSwimlanes: ui.exportIncludeSwimlanes,
        includeBackground: ui.exportIncludeBackground,
        darkMode: ui.darkMode,
      });
      pushToast('PDF exported', 'success');
    } catch {
      pushToast('PDF export failed', 'error');
    }
  }, [currentViewport, nodes, pushToast, ui.darkMode, ui.exportIncludeBackground, ui.exportIncludeSwimlanes]);

  const startNewDiagram = useCallback(() => {
    newDiagram();
    clearHistory();
    pushToast('Started a new diagram', 'info');
  }, [clearHistory, newDiagram, pushToast]);

  const autoLayout = useCallback(() => {
    if (!nodes.length) {
      pushToast('No nodes to layout', 'info');
      return;
    }

    const nextNodes = applyDagreLayout(nodes, edges, ui.autoLayoutDirection);
    setNodes(nextNodes);
    select(null, null);
    if (rfInstance) {
      window.requestAnimationFrame(() => {
        rfInstance.fitView({ duration: 300, padding: 0.4 });
      });
    }
    pushToast('Auto layout applied', 'success');
  }, [edges, nodes, pushToast, rfInstance, select, setNodes, ui.autoLayoutDirection]);

  return {
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
    findNode,
    exportPng,
    exportPdfFile,
    autoLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
