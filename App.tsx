
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, Sparkles, X } from 'lucide-react';
import FlowCanvas from './components/FlowCanvas';
import Sidebar from './components/Sidebar';
import Inspector, { type InspectorTab } from './components/Inspector';
import TopBar from './components/layout/TopBar';
import FloatingContextBar from './components/layout/FloatingContextBar';
import ShortcutsModal from './components/help/ShortcutsModal';
import {
  Node,
  AccountType,
  Edge,
  EntityType,
  PaymentRail,
  DrawingPath,
  FlowDirection,
  NodeShape,
  Position,
  ViewportTransform,
  DiagramSnapshot,
  LayoutSettings,
  ExportPayloadV2,
  LaneGroupingMode
} from './types';
import { useUIStore } from './stores/uiStore';
import {
  cloneSnapshot,
  createExportPayload,
  loadDiagramFromStorage,
  loadLayoutFromStorage,
  parseImportPayload,
  persistDiagramToStorage,
  persistLayoutToStorage
} from './lib/diagramIO';
import { downloadPdfExport, downloadPngExport, downloadSvgExport } from './lib/exportAssets';

const STORAGE_KEY = 'finflow-builder.diagram.v1';
const LAYOUT_STORAGE_KEY = 'finflow-builder.layout.v1';
const RECOVERY_STORAGE_KEY = 'finflow-builder.recovery.diagram.v1';
const RECOVERY_LAYOUT_STORAGE_KEY = 'finflow-builder.recovery.layout.v1';
const RECOVERY_META_STORAGE_KEY = 'finflow-builder.recovery.meta.v1';
const HISTORY_LIMIT = 100;
const MOBILE_BREAKPOINT = 1024;
const CONNECTOR_DEFAULT_LENGTH = 220;
const CONNECTOR_HANDLE_HALF = 8;
const CONNECTOR_DRAG_TYPE = 'application/finflow/tool';
const CONNECTOR_DRAG_VALUE = 'connector';
const ONBOARDING_DISMISSED_STORAGE_KEY = 'finflow-builder.quickstart.dismissed.v1';
const TOAST_TIMEOUT_MS = 4200;

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const STARTER_SNAPSHOT: DiagramSnapshot = {
  nodes: [
    {
      id: 'starter-sponsor',
      type: EntityType.SPONSOR_BANK,
      label: 'Sponsor Bank',
      shape: NodeShape.RECTANGLE,
      position: { x: 280, y: 320 },
      zIndex: 10,
      swimlaneId: 2
    },
    {
      id: 'starter-processor',
      type: EntityType.PROCESSOR,
      label: 'Processor',
      shape: NodeShape.RECTANGLE,
      position: { x: 580, y: 320 },
      zIndex: 10,
      swimlaneId: 2
    },
    {
      id: 'starter-network',
      type: EntityType.NETWORK,
      label: 'Card Network',
      shape: NodeShape.RECTANGLE,
      position: { x: 880, y: 320 },
      zIndex: 10,
      swimlaneId: 2
    }
  ],
  edges: [
    {
      id: 'starter-edge-1',
      sourceId: 'starter-sponsor',
      targetId: 'starter-processor',
      sourcePortIdx: 1,
      targetPortIdx: 3,
      rail: PaymentRail.ACH,
      direction: FlowDirection.PUSH,
      label: 'Funding',
      isFX: false,
      thickness: 2,
      style: 'solid',
      showArrowHead: true,
      showMidArrow: false,
      pathType: 'bezier'
    },
    {
      id: 'starter-edge-2',
      sourceId: 'starter-processor',
      targetId: 'starter-network',
      sourcePortIdx: 1,
      targetPortIdx: 3,
      rail: PaymentRail.CARD_NETWORK,
      direction: FlowDirection.PUSH,
      label: 'Authorization',
      isFX: false,
      thickness: 2,
      style: 'solid',
      showArrowHead: true,
      showMidArrow: false,
      pathType: 'bezier'
    }
  ],
  drawings: []
};

type GeneratedNode = {
  id: string;
  type: string;
  label: string;
  position: { x: number; y: number };
};

type GeneratedEdge = {
  id: string;
  sourceId: string;
  targetId: string;
  rail?: string;
  label: string;
};

const isGeneratedNode = (value: unknown): value is GeneratedNode => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GeneratedNode>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.label === 'string' &&
    !!candidate.position &&
    typeof candidate.position.x === 'number' &&
    typeof candidate.position.y === 'number'
  );
};

const isGeneratedEdge = (value: unknown): value is GeneratedEdge => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GeneratedEdge>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.sourceId === 'string' &&
    typeof candidate.targetId === 'string' &&
    typeof candidate.label === 'string'
  );
};

const isValidEntityType = (value: string): value is EntityType => {
  return Object.values(EntityType).includes(value as EntityType);
};

const isValidPaymentRail = (value: string): value is PaymentRail => {
  return Object.values(PaymentRail).includes(value as PaymentRail);
};

const pruneOrphanConnectorHandles = (allNodes: Node[], allEdges: Edge[]): Node[] => {
  return allNodes.filter((node) => {
    if (!node.isConnectorHandle) return true;
    return allEdges.some((edge) => edge.sourceId === node.id || edge.targetId === node.id);
  });
};

const getNodeDimensions = (node: Node) => {
  const width =
    node.width || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : 180);
  const height =
    node.height || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : 60);
  return { width, height };
};

const getNodeCenter = (node: Node) => {
  if (node.type === EntityType.ANCHOR) {
    return { x: node.position.x + 8, y: node.position.y + 8 };
  }

  const { width, height } = getNodeDimensions(node);

  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2
  };
};

const getSquaredDistance = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const hasDirectConnection = (allEdges: Edge[], nodeAId: string, nodeBId: string) =>
  allEdges.some(
    (edge) =>
      (edge.sourceId === nodeAId && edge.targetId === nodeBId) ||
      (edge.sourceId === nodeBId && edge.targetId === nodeAId)
  );

const getLaneLabelsForMode = (mode: LaneGroupingMode): string[] => {
  if (mode === 'entity') {
    return ['Banks', 'Processors & Networks', 'Controls & Treasury', 'Endpoints'];
  }
  if (mode === 'regulatory') {
    return ['Regulated Institutions', 'Payment Operations', 'Compliance Controls', 'Counterparties'];
  }
  if (mode === 'geography') {
    return ['North America', 'EMEA', 'APAC', 'LATAM / Other'];
  }
  if (mode === 'ledger') {
    return ['Customer Accounts', 'Omnibus / FBO', 'Settlement / Reserve', 'Treasury & Control'];
  }
  return [];
};

const getLaneIdForNode = (node: Node, mode: LaneGroupingMode): number | undefined => {
  if (mode === 'manual') return node.swimlaneId;

  if (mode === 'entity') {
    if (
      node.type === EntityType.SPONSOR_BANK ||
      node.type === EntityType.ISSUING_BANK ||
      node.type === EntityType.ACQUIRING_BANK ||
      node.type === EntityType.CENTRAL_BANK ||
      node.type === EntityType.CREDIT_UNION ||
      node.type === EntityType.CORRESPONDENT_BANK
    ) {
      return 1;
    }
    if (
      node.type === EntityType.PROCESSOR ||
      node.type === EntityType.NETWORK ||
      node.type === EntityType.GATEWAY ||
      node.type === EntityType.SWITCH ||
      node.type === EntityType.WALLET_PROVIDER ||
      node.type === EntityType.PROGRAM_MANAGER
    ) {
      return 2;
    }
    if (node.type === EntityType.GATE || node.type === EntityType.LIQUIDITY_PROVIDER) {
      return 3;
    }
    return 4;
  }

  if (mode === 'regulatory') {
    if (
      node.type === EntityType.SPONSOR_BANK ||
      node.type === EntityType.ISSUING_BANK ||
      node.type === EntityType.ACQUIRING_BANK ||
      node.type === EntityType.CENTRAL_BANK ||
      node.type === EntityType.CREDIT_UNION ||
      node.type === EntityType.CORRESPONDENT_BANK
    ) {
      return 1;
    }
    if (
      node.type === EntityType.PROCESSOR ||
      node.type === EntityType.GATEWAY ||
      node.type === EntityType.SWITCH ||
      node.type === EntityType.NETWORK
    ) {
      return 2;
    }
    if (node.type === EntityType.GATE || node.type === EntityType.LIQUIDITY_PROVIDER) {
      return 3;
    }
    return 4;
  }

  if (mode === 'geography') {
    return 1;
  }

  if (mode === 'ledger') {
    if (node.accountType === undefined || node.accountType === null) {
      if (node.type === EntityType.END_POINT) return 1;
      if (node.type === EntityType.LIQUIDITY_PROVIDER) return 4;
      return 1;
    }
    if (node.accountType === AccountType.FBO || node.accountType === AccountType.TREASURY) {
      return 2;
    }
    if (
      node.accountType === AccountType.SETTLEMENT ||
      node.accountType === AccountType.RESERVE
    ) {
      return 3;
    }
    if (node.type === EntityType.LIQUIDITY_PROVIDER || node.type === EntityType.GATE) {
      return 4;
    }
    return 1;
  }

  return node.swimlaneId;
};

type EditMergeState = { id: string | null; at: number };
type ToastTone = 'info' | 'success' | 'warning' | 'error';
type ToastMessage = {
  id: string;
  tone: ToastTone;
  text: string;
};
type RecoveryMeta = {
  lastSavedAt: string;
};

const parseRecoveryMeta = (value: unknown): RecoveryMeta | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<RecoveryMeta>;
  if (typeof candidate.lastSavedAt !== 'string') return null;
  const parsedDate = Date.parse(candidate.lastSavedAt);
  if (Number.isNaN(parsedDate)) return null;
  return { lastSavedAt: candidate.lastSavedAt };
};

const loadRecoveryMeta = (): RecoveryMeta | null => {
  try {
    const raw = window.localStorage.getItem(RECOVERY_META_STORAGE_KEY);
    if (!raw) return null;
    return parseRecoveryMeta(JSON.parse(raw));
  } catch {
    return null;
  }
};

const persistRecoveryMeta = (meta: RecoveryMeta): boolean => {
  try {
    window.localStorage.setItem(RECOVERY_META_STORAGE_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
};

const formatBackupTimestamp = (iso: string | null): string | null => {
  if (!iso) return null;
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
};

const shouldRecordEditHistory = (
  ref: React.MutableRefObject<EditMergeState>,
  id: string,
  mergeWindowMs = 700
) => {
  const now = Date.now();
  if (ref.current.id === id && now - ref.current.at < mergeWindowMs) {
    ref.current.at = now;
    return false;
  }
  ref.current = { id, at: now };
  return true;
};

const isEditableTarget = (target: EventTarget | null): target is HTMLElement => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

const App: React.FC = () => {
  const isAIEnabled = import.meta.env.VITE_ENABLE_AI === 'true';
  const feedbackHref = (import.meta.env.VITE_FEEDBACK_URL as string) || 'mailto:feedback@finflow.app';
  // --- STATE ---
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= MOBILE_BREAKPOINT : true
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const showPorts = useUIStore((state) => state.showPorts);
  const setShowPorts = useUIStore((state) => state.setShowPorts);
  const toggleShowPorts = useUIStore((state) => state.toggleShowPorts);
  const showSwimlanes = useUIStore((state) => state.showSwimlanes);
  const setShowSwimlanes = useUIStore((state) => state.setShowSwimlanes);
  const toggleShowSwimlanes = useUIStore((state) => state.toggleShowSwimlanes);
  const swimlaneLabels = useUIStore((state) => state.swimlaneLabels);
  const setSwimlaneLabels = useUIStore((state) => state.setSwimlaneLabels);
  const addSwimlane = useUIStore((state) => state.addSwimlane);
  const removeSwimlane = useUIStore((state) => state.removeSwimlane);
  const updateSwimlaneLabel = useUIStore((state) => state.updateSwimlaneLabel);
  const gridMode = useUIStore((state) => state.gridMode);
  const setGridMode = useUIStore((state) => state.setGridMode);
  const overlayMode = useUIStore((state) => state.overlayMode);
  const setOverlayMode = useUIStore((state) => state.setOverlayMode);
  const laneGroupingMode = useUIStore((state) => state.laneGroupingMode);
  const setLaneGroupingMode = useUIStore((state) => state.setLaneGroupingMode);
  const activeTool = useUIStore((state) => state.activeTool);
  const setActiveTool = useUIStore((state) => state.setActiveTool);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isQuickStartVisible, setIsQuickStartVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY) !== 'true';
  });
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [inspectorTabRequest, setInspectorTabRequest] = useState<InspectorTab | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showMinimap, setShowMinimap] = useState(false);
  const [viewport, setViewport] = useState<ViewportTransform>({ x: 0, y: 0, zoom: 1 });
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [hasRecoverySnapshot, setHasRecoverySnapshot] = useState(false);
  const [recoveryLastSavedAt, setRecoveryLastSavedAt] = useState<string | null>(null);
  
  // Link Attributes State
  const [activeEdgeStyle, setActiveEdgeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [activeArrowConfig, setActiveArrowConfig] = useState({ showArrowHead: true, showMidArrow: false });

  const [past, setPast] = useState<DiagramSnapshot[]>([]);
  const [future, setFuture] = useState<DiagramSnapshot[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const exportLayerRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const lastNodeEditRef = useRef<EditMergeState>({ id: null, at: 0 });
  const lastEdgeEditRef = useRef<EditMergeState>({ id: null, at: 0 });
  const lastNudgeRef = useRef<EditMergeState>({ id: null, at: 0 });
  const pendingNodePositionsRef = useRef<Record<string, Position>>({});
  const nodePositionRafRef = useRef<number | null>(null);
  const hasLoadedFromStorage = useRef(false);
  const saveDiagramTimeoutRef = useRef<number | null>(null);
  const saveLayoutTimeoutRef = useRef<number | null>(null);
  const wasMobileViewportRef = useRef(isMobileViewport);
  // --- BASE UTILITIES ---

  const pushToast = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, TOAST_TIMEOUT_MS);
  }, []);

  const dismissQuickStart = useCallback(() => {
    setIsQuickStartVisible(false);
    try {
      window.localStorage.setItem(ONBOARDING_DISMISSED_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage errors and only dismiss for this session.
    }
  }, []);

  const openHelp = useCallback(() => {
    setIsQuickStartVisible(true);
    setIsShortcutsOpen(true);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (wasMobileViewportRef.current === isMobileViewport) return;
    if (isMobileViewport) {
      setIsSidebarOpen(false);
      setIsInspectorOpen(false);
    } else {
      setIsSidebarOpen(false);
    }
    wasMobileViewportRef.current = isMobileViewport;
  }, [isMobileViewport]);

  useEffect(() => {
    return () => {
      if (nodePositionRafRef.current !== null) {
        window.cancelAnimationFrame(nodePositionRafRef.current);
      }
    };
  }, []);

  const getCurrentSnapshot = useCallback(() => cloneSnapshot({ nodes, edges, drawings }), [nodes, edges, drawings]);

  const getCurrentLayout = useCallback(
    (): LayoutSettings => ({
      showSwimlanes,
      swimlaneLabels,
      gridMode,
      isDarkMode,
      showPorts
    }),
    [showSwimlanes, swimlaneLabels, gridMode, isDarkMode, showPorts]
  );

  const applyLayoutSettings = useCallback(
    (layout: Partial<LayoutSettings>) => {
      if (typeof layout.showSwimlanes === 'boolean') {
        setShowSwimlanes(layout.showSwimlanes);
      }
      if (Array.isArray(layout.swimlaneLabels) && layout.swimlaneLabels.length >= 2) {
        setSwimlaneLabels(layout.swimlaneLabels);
      }
      if (layout.gridMode) {
        setGridMode(layout.gridMode);
      }
      if (typeof layout.isDarkMode === 'boolean') {
        setIsDarkMode(layout.isDarkMode);
      }
      if (typeof layout.showPorts === 'boolean') {
        setShowPorts(layout.showPorts);
      }
    },
    [setGridMode, setShowPorts, setShowSwimlanes, setSwimlaneLabels]
  );

  const applySnapshot = useCallback((snapshot: DiagramSnapshot) => {
    const safe = cloneSnapshot(snapshot);
    setNodes(safe.nodes);
    setEdges(safe.edges);
    setDrawings(safe.drawings);
  }, []);

  const selectedNodeId = selectedNodeIds.length === 1 ? selectedNodeIds[0] : null;

  const pushHistory = useCallback(() => {
    const current = getCurrentSnapshot();
    setPast((prev) => [...prev.slice(-(HISTORY_LIMIT - 1)), current]);
    setFuture([]);
  }, [getCurrentSnapshot]);

  const saveRecoverySnapshot = useCallback(
    (snapshot: DiagramSnapshot = getCurrentSnapshot(), layout: LayoutSettings = getCurrentLayout()) => {
      const diagramSaved = persistDiagramToStorage(RECOVERY_STORAGE_KEY, snapshot);
      const layoutSaved = persistLayoutToStorage(RECOVERY_LAYOUT_STORAGE_KEY, layout);
      const nextMeta: RecoveryMeta = { lastSavedAt: new Date().toISOString() };
      const metaSaved = persistRecoveryMeta(nextMeta);
      if (diagramSaved && layoutSaved) {
        setHasRecoverySnapshot(true);
        if (metaSaved) {
          setRecoveryLastSavedAt(nextMeta.lastSavedAt);
        }
        if (!metaSaved) {
          setStorageWarning('Recovery backup saved, but backup timestamp metadata could not be written.');
        }
        return true;
      }
      setStorageWarning(
        'Recovery backup could not be saved. Browser storage may be unavailable.'
      );
      return false;
    },
    [getCurrentLayout, getCurrentSnapshot]
  );

  useEffect(() => {
    if (hasLoadedFromStorage.current) return;
    const persistedDiagram = loadDiagramFromStorage(STORAGE_KEY);
    if (persistedDiagram) {
      applySnapshot(persistedDiagram);
    } else {
      applySnapshot(STARTER_SNAPSHOT);
    }

    const persistedLayout = loadLayoutFromStorage(LAYOUT_STORAGE_KEY);
    if (persistedLayout) {
      applyLayoutSettings(persistedLayout);
    }
    const persistedRecoveryDiagram = loadDiagramFromStorage(RECOVERY_STORAGE_KEY);
    setHasRecoverySnapshot(!!persistedRecoveryDiagram);
    if (persistedRecoveryDiagram) {
      setRecoveryLastSavedAt(loadRecoveryMeta()?.lastSavedAt || null);
    } else {
      setRecoveryLastSavedAt(null);
    }
    hasLoadedFromStorage.current = true;
  }, [applyLayoutSettings, applySnapshot]);

  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    const current = getCurrentSnapshot();
    if (saveDiagramTimeoutRef.current !== null) {
      window.clearTimeout(saveDiagramTimeoutRef.current);
    }
    saveDiagramTimeoutRef.current = window.setTimeout(() => {
      const saved = persistDiagramToStorage(STORAGE_KEY, current);
      if (!saved) {
        setStorageWarning('Autosave is unavailable. Your changes may not persist after refresh.');
      }
    }, 180);
    return () => {
      if (saveDiagramTimeoutRef.current !== null) {
        window.clearTimeout(saveDiagramTimeoutRef.current);
      }
    };
  }, [nodes, edges, drawings, getCurrentSnapshot]);

  useEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    const currentLayout = getCurrentLayout();
    if (saveLayoutTimeoutRef.current !== null) {
      window.clearTimeout(saveLayoutTimeoutRef.current);
    }
    saveLayoutTimeoutRef.current = window.setTimeout(() => {
      const saved = persistLayoutToStorage(LAYOUT_STORAGE_KEY, currentLayout);
      if (!saved) {
        setStorageWarning('Layout autosave is unavailable. Your view preferences may not persist.');
      }
    }, 180);
    return () => {
      if (saveLayoutTimeoutRef.current !== null) {
        window.clearTimeout(saveLayoutTimeoutRef.current);
      }
    };
  }, [getCurrentLayout]);

  const handleUpdateNode = useCallback((updatedNode: Node) => {
    if (shouldRecordEditHistory(lastNodeEditRef, updatedNode.id)) {
      pushHistory();
    }
    setNodes((prev) => prev.map((n) => (n.id === updatedNode.id ? updatedNode : n)));
  }, [pushHistory]);

  const handleUpdateEdge = useCallback((updatedEdge: Edge) => {
    if (shouldRecordEditHistory(lastEdgeEditRef, updatedEdge.id)) {
      pushHistory();
    }
    setEdges((prev) => prev.map((e) => (e.id === updatedEdge.id ? updatedEdge : e)));
  }, [pushHistory]);

  const flushPendingNodePositions = useCallback(() => {
    nodePositionRafRef.current = null;
    const pending = pendingNodePositionsRef.current;
    pendingNodePositionsRef.current = {};
    const updates = Object.entries(pending);
    if (updates.length === 0) return;

    const updatesById = new Map<string, Position>(updates);
    setNodes((prev) =>
      prev.map((node) => {
        const nextPosition = updatesById.get(node.id);
        if (!nextPosition) return node;
        return {
          ...node,
          position: nextPosition,
          swimlaneId: Math.floor(Math.max(0, nextPosition.y) / 300) + 1
        };
      })
    );
  }, []);

  const handleUpdateNodePosition = useCallback(
    (id: string, pos: Position) => {
      pendingNodePositionsRef.current[id] = pos;
      if (nodePositionRafRef.current !== null) return;
      nodePositionRafRef.current = window.requestAnimationFrame(flushPendingNodePositions);
    },
    [flushPendingNodePositions]
  );

  const handleSelectEdge = useCallback((id: string | null) => {
    setInspectorTabRequest(null);
    setSelectedEdgeId(id);
    if (!id) {
      return;
    }

    setSelectedNodeIds([]);
    setIsInspectorOpen(true);
    if (isMobileViewport) {
      setIsSidebarOpen(false);
    }
    const edge = edges.find((e) => e.id === id);
    if (edge) {
      setActiveEdgeStyle(edge.style);
      setActiveArrowConfig({
        showArrowHead: edge.showArrowHead,
        showMidArrow: !!edge.showMidArrow
      });
    }
  }, [edges, isMobileViewport]);

  const handleSelectNodes = useCallback((ids: string[]) => {
    setInspectorTabRequest(null);
    setSelectedNodeIds(ids);
    setSelectedEdgeId(null);
    if (ids.length === 1) {
      setIsInspectorOpen(true);
      if (isMobileViewport) {
        setIsSidebarOpen(false);
      }
    } else {
      setIsInspectorOpen(false);
    }
  }, [isMobileViewport]);

  const getCanvasCenterWorld = useCallback(() => {
    const sidebarOffset = isSidebarOpen ? 256 : 0;
    const availableWidth = window.innerWidth - sidebarOffset;
    return {
      x: ((availableWidth / 2 + sidebarOffset) - viewport.x) / viewport.zoom,
      y: (window.innerHeight / 2 - viewport.y) / viewport.zoom
    };
  }, [viewport, isSidebarOpen]);

  const handleAddNode = useCallback((type: EntityType, pos?: { x: number; y: number }) => {
    pushHistory();
    setNodes((prev) => {
      let finalPos = pos;
      if (!finalPos) {
          const center = getCanvasCenterWorld();
          const nonConnectorCount = prev.filter((node) => !node.isConnectorHandle).length;
          const quickAddOffsets = [
            { x: 0, y: 0 },
            { x: 220, y: 0 },
            { x: -220, y: 0 },
            { x: 0, y: 120 },
            { x: 220, y: 120 },
            { x: -220, y: 120 },
            { x: 0, y: -120 },
            { x: 220, y: -120 },
            { x: -220, y: -120 }
          ];
          const offset = quickAddOffsets[nonConnectorCount % quickAddOffsets.length];
          const cycle = Math.floor(nonConnectorCount / quickAddOffsets.length);
          finalPos = {
            x: center.x - 90 + offset.x + cycle * 24,
            y: center.y - 30 + offset.y + cycle * 24
          };
      }

      const newNode: Node = {
        id: createId('node'),
        type,
        label: type,
        shape: type === EntityType.GATE ? NodeShape.DIAMOND : NodeShape.RECTANGLE,
        position: finalPos,
        zIndex: 100,
        swimlaneId: Math.floor(Math.max(0, finalPos.y) / 300) + 1
      };
      return [...prev, newNode];
    });
  }, [pushHistory, getCanvasCenterWorld]);

  const handleConnect = useCallback((sourceId: string, targetId: string, spIdx: number, tpIdx: number) => {
    const newEdgeId = createId('edge');
    const newEdge: Edge = {
      id: newEdgeId,
      sourceId,
      targetId,
      sourcePortIdx: spIdx,
      targetPortIdx: tpIdx,
      rail: PaymentRail.BLANK,
      direction: FlowDirection.PUSH,
      label: 'Transfer',
      isFX: false,
      thickness: 2,
      style: activeEdgeStyle, 
      showArrowHead: activeArrowConfig.showArrowHead,
      showMidArrow: activeArrowConfig.showMidArrow,
      pathType: 'bezier'
    };
    pushHistory();
    setEdges((prev) => [...prev, newEdge]);
    handleSelectEdge(newEdgeId);
  }, [activeEdgeStyle, activeArrowConfig, pushHistory, handleSelectEdge]);

  const connectNodesWithAutoPorts = useCallback(
    (sourceNode: Node, targetNode: Node) => {
      const sourceCenter = getNodeCenter(sourceNode);
      const targetCenter = getNodeCenter(targetNode);
      const dx = targetCenter.x - sourceCenter.x;
      const dy = targetCenter.y - sourceCenter.y;

      let sourcePort = 1;
      let targetPort = 3;

      if (Math.abs(dx) >= Math.abs(dy)) {
        sourcePort = dx >= 0 ? 1 : 3;
        targetPort = dx >= 0 ? 3 : 1;
      } else {
        sourcePort = dy >= 0 ? 2 : 0;
        targetPort = dy >= 0 ? 0 : 2;
      }

      handleConnect(sourceNode.id, targetNode.id, sourcePort, targetPort);
    },
    [handleConnect]
  );

  const handleAutoConnectEdge = useCallback(() => {
    const eligibleNodes = nodes.filter((node) => !node.isConnectorHandle);
    if (eligibleNodes.length < 2) return;

    const findNearestTarget = (source: Node, candidates: Node[]) => {
      const sourceCenter = getNodeCenter(source);
      const ranked = candidates
        .map((candidate) => ({
          node: candidate,
          distance: getSquaredDistance(sourceCenter, getNodeCenter(candidate))
        }))
        .sort((a, b) => a.distance - b.distance);

      const unlinked = ranked.find(
        ({ node }) => !hasDirectConnection(edges, source.id, node.id)
      );
      return (unlinked || ranked[0] || null)?.node || null;
    };

    let sourceNode: Node | null = null;
    let targetNode: Node | null = null;

    if (selectedNodeId) {
      const selected = eligibleNodes.find((node) => node.id === selectedNodeId) || null;
      if (selected) {
        sourceNode = selected;
        targetNode = findNearestTarget(
          selected,
          eligibleNodes.filter((node) => node.id !== selected.id)
        );
      }
    }

    if (!sourceNode || !targetNode) {
      let bestPair: { source: Node; target: Node; distance: number } | null = null;

      for (let i = 0; i < eligibleNodes.length; i += 1) {
        for (let j = i + 1; j < eligibleNodes.length; j += 1) {
          const nodeA = eligibleNodes[i];
          const nodeB = eligibleNodes[j];
          if (hasDirectConnection(edges, nodeA.id, nodeB.id)) continue;

          const distance = getSquaredDistance(getNodeCenter(nodeA), getNodeCenter(nodeB));
          if (!bestPair || distance < bestPair.distance) {
            const aCenter = getNodeCenter(nodeA);
            const bCenter = getNodeCenter(nodeB);
            const source = aCenter.x <= bCenter.x ? nodeA : nodeB;
            const target = source.id === nodeA.id ? nodeB : nodeA;
            bestPair = { source, target, distance };
          }
        }
      }

      if (!bestPair) {
        const first = eligibleNodes[0];
        const second = findNearestTarget(
          first,
          eligibleNodes.filter((node) => node.id !== first.id)
        );
        if (!second) return;
        bestPair = { source: first, target: second, distance: 0 };
      }

      sourceNode = bestPair.source;
      targetNode = bestPair.target;
    }

    if (!sourceNode || !targetNode) return;
    setActiveTool('draw');
    connectNodesWithAutoPorts(sourceNode, targetNode);
  }, [connectNodesWithAutoPorts, edges, nodes, selectedNodeId, setActiveTool]);

  const getDefaultConnectorCenter = useCallback(() => {
    const base = getCanvasCenterWorld();
    const halfLength = CONNECTOR_DEFAULT_LENGTH / 2 + CONNECTOR_HANDLE_HALF;
    const candidateOffsets = [
      { x: 0, y: 0 },
      { x: 0, y: 150 },
      { x: 0, y: -150 },
      { x: 260, y: 0 },
      { x: -260, y: 0 },
      { x: 260, y: 150 },
      { x: -260, y: 150 },
      { x: 260, y: -150 },
      { x: -260, y: -150 }
    ];

    const collidesWithNode = (center: { x: number; y: number }) => {
      const connectorBounds = {
        left: center.x - halfLength,
        right: center.x + halfLength,
        top: center.y - 24,
        bottom: center.y + 24
      };

      return nodes.some((node) => {
        if (node.isConnectorHandle) return false;
        const { width, height } = getNodeDimensions(node);
        const nodeBounds = {
          left: node.position.x,
          right: node.position.x + width,
          top: node.position.y,
          bottom: node.position.y + height
        };

        return !(
          connectorBounds.right < nodeBounds.left ||
          connectorBounds.left > nodeBounds.right ||
          connectorBounds.bottom < nodeBounds.top ||
          connectorBounds.top > nodeBounds.bottom
        );
      });
    };

    for (const offset of candidateOffsets) {
      const candidate = {
        x: base.x + offset.x,
        y: base.y + offset.y
      };
      if (!collidesWithNode(candidate)) {
        return candidate;
      }
    }

    return base;
  }, [getCanvasCenterWorld, nodes]);

  const handleAddConnector = useCallback((centerPos?: { x: number; y: number }) => {
    const center = centerPos || getDefaultConnectorCenter();
    const halfLength = CONNECTOR_DEFAULT_LENGTH / 2;
    const sourceNodeId = createId('node');
    const targetNodeId = createId('node');
    const edgeId = createId('edge');

    const startNode: Node = {
      id: sourceNodeId,
      type: EntityType.ANCHOR,
      label: 'Connector Start',
      shape: NodeShape.CIRCLE,
      position: {
        x: center.x - halfLength - CONNECTOR_HANDLE_HALF,
        y: center.y - CONNECTOR_HANDLE_HALF
      },
      zIndex: 5,
      swimlaneId: Math.floor(Math.max(0, center.y) / 300) + 1,
      isConnectorHandle: true
    };

    const endNode: Node = {
      id: targetNodeId,
      type: EntityType.ANCHOR,
      label: 'Connector End',
      shape: NodeShape.CIRCLE,
      position: {
        x: center.x + halfLength - CONNECTOR_HANDLE_HALF,
        y: center.y - CONNECTOR_HANDLE_HALF
      },
      zIndex: 5,
      swimlaneId: Math.floor(Math.max(0, center.y) / 300) + 1,
      isConnectorHandle: true
    };

    const newEdge: Edge = {
      id: edgeId,
      sourceId: sourceNodeId,
      targetId: targetNodeId,
      sourcePortIdx: 0,
      targetPortIdx: 0,
      rail: PaymentRail.BLANK,
      direction: FlowDirection.PUSH,
      label: 'Connector',
      isFX: false,
      thickness: 2,
      style: activeEdgeStyle,
      showArrowHead: activeArrowConfig.showArrowHead,
      showMidArrow: activeArrowConfig.showMidArrow,
      pathType: 'bezier'
    };

    pushHistory();
    setNodes((prev) => [...prev, startNode, endNode]);
    setEdges((prev) => [...prev, newEdge]);
    setSelectedNodeIds([]);
    setSelectedEdgeId(edgeId);
    setActiveEdgeStyle(newEdge.style);
    setActiveArrowConfig({
      showArrowHead: newEdge.showArrowHead,
      showMidArrow: !!newEdge.showMidArrow
    });
    setIsInspectorOpen(true);
  }, [activeArrowConfig, activeEdgeStyle, getDefaultConnectorCenter, pushHistory]);

  const handleConnectorNativeDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>) => {
      event.dataTransfer.setData(CONNECTOR_DRAG_TYPE, CONNECTOR_DRAG_VALUE);
      event.dataTransfer.effectAllowed = 'copy';
    },
    []
  );

  const handleDelete = useCallback(() => {
    if (selectedNodeIds.length === 0 && !selectedEdgeId) return;
    pushHistory();

    if (selectedNodeIds.length > 0) {
      const selectedSet = new Set(selectedNodeIds);
      const nextEdges = edges.filter(
        (edge) => !selectedSet.has(edge.sourceId) && !selectedSet.has(edge.targetId)
      );
      const nextNodes = pruneOrphanConnectorHandles(
        nodes.filter((node) => !selectedSet.has(node.id)),
        nextEdges
      );

      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedNodeIds([]);
    } else if (selectedEdgeId) {
      const nextEdges = edges.filter((edge) => edge.id !== selectedEdgeId);
      const nextNodes = pruneOrphanConnectorHandles(nodes, nextEdges);
      setEdges(nextEdges);
      setNodes(nextNodes);
      setSelectedEdgeId(null);
    }

    setIsInspectorOpen(false);
  }, [selectedNodeIds, selectedEdgeId, pushHistory, edges, nodes]);

  const moveSelectedNodesBy = useCallback((dx: number, dy: number, mergeWindowMs = 180) => {
    if (selectedNodeIds.length === 0) return;

    const mergeKey = selectedNodeIds.slice().sort().join('|');
    if (shouldRecordEditHistory(lastNudgeRef, mergeKey, mergeWindowMs)) {
      pushHistory();
    }

    const selectedSet = new Set(selectedNodeIds);
    setNodes((prev) =>
      prev.map((node) => {
        if (!selectedSet.has(node.id)) return node;
        const nextPosition = {
          x: node.position.x + dx,
          y: node.position.y + dy
        };
        return {
          ...node,
          position: nextPosition,
          swimlaneId: Math.floor(Math.max(0, nextPosition.y) / 300) + 1
        };
      })
    );
  }, [selectedNodeIds, pushHistory]);

  const handleDuplicateSelection = useCallback(() => {
    if (selectedNodeIds.length === 0) return;

    const selectedNodeSet = new Set(selectedNodeIds);
    const selectedNodes = nodes.filter((node) => selectedNodeSet.has(node.id));
    if (selectedNodes.length === 0) return;

    const idMap = new Map<string, string>();
    const duplicatedNodes = selectedNodes.map((node) => {
      const newId = createId('node');
      idMap.set(node.id, newId);
      const nextPosition = {
        x: node.position.x + 40,
        y: node.position.y + 40
      };
      return {
        ...node,
        id: newId,
        position: nextPosition,
        swimlaneId: Math.floor(Math.max(0, nextPosition.y) / 300) + 1
      } satisfies Node;
    });

    const duplicatedEdges = edges
      .filter((edge) => selectedNodeSet.has(edge.sourceId) && selectedNodeSet.has(edge.targetId))
      .map((edge) => ({
        ...edge,
        id: createId('edge'),
        sourceId: idMap.get(edge.sourceId) || edge.sourceId,
        targetId: idMap.get(edge.targetId) || edge.targetId
      }));

    pushHistory();
    setNodes((prev) => [...prev, ...duplicatedNodes]);
    if (duplicatedEdges.length > 0) {
      setEdges((prev) => [...prev, ...duplicatedEdges]);
    }
    setSelectedNodeIds(duplicatedNodes.map((node) => node.id));
    setSelectedEdgeId(null);
  }, [selectedNodeIds, nodes, edges, pushHistory]);

  const handleAlignSelectedNodes = useCallback((mode: 'left' | 'center' | 'right') => {
    if (selectedNodeIds.length < 2) return;

    const selectedSet = new Set(selectedNodeIds);
    const selectedNodes = nodes.filter((node) => selectedSet.has(node.id));
    if (selectedNodes.length < 2) return;

    const left = Math.min(...selectedNodes.map((node) => node.position.x));
    const right = Math.max(
      ...selectedNodes.map((node) => {
        const { width } = getNodeDimensions(node);
        return node.position.x + width;
      })
    );
    const center = (left + right) / 2;

    pushHistory();
    setNodes((prev) =>
      prev.map((node) => {
        if (!selectedSet.has(node.id)) return node;
        const { width } = getNodeDimensions(node);
        let x = node.position.x;
        if (mode === 'left') x = left;
        if (mode === 'center') x = center - width / 2;
        if (mode === 'right') x = right - width;
        return { ...node, position: { ...node.position, x } };
      })
    );
  }, [selectedNodeIds, nodes, pushHistory]);

  const handleDistributeSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length < 3) return;
    const selectedSet = new Set(selectedNodeIds);
    const selectedNodes = nodes.filter((node) => selectedSet.has(node.id));
    if (selectedNodes.length < 3) return;

    const sorted = [...selectedNodes].sort((a, b) => a.position.x - b.position.x);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const span = last.position.x - first.position.x;
    if (span === 0) return;
    const step = span / (sorted.length - 1);

    const nextXById = new Map<string, number>();
    sorted.forEach((node, index) => {
      nextXById.set(node.id, first.position.x + step * index);
    });

    pushHistory();
    setNodes((prev) =>
      prev.map((node) => {
        const nextX = nextXById.get(node.id);
        if (nextX === undefined) return node;
        return { ...node, position: { ...node.position, x: nextX } };
      })
    );
  }, [selectedNodeIds, nodes, pushHistory]);

  const handleAddDrawing = useCallback((d: DrawingPath) => {
    pushHistory();
    setDrawings((prev) => [...prev, d]);
  }, [pushHistory]);

  const handleToggleSwimlanes = useCallback(() => {
    toggleShowSwimlanes();
  }, [toggleShowSwimlanes]);

  const handleToggleRiskOverlay = useCallback(() => {
    if (overlayMode === 'none') {
      setOverlayMode('risk');
      return;
    }
    if (overlayMode === 'risk') {
      setOverlayMode('none');
      return;
    }
    if (overlayMode === 'ledger') {
      setOverlayMode('both');
      return;
    }
    setOverlayMode('ledger');
  }, [overlayMode, setOverlayMode]);

  const handleToggleLedgerOverlay = useCallback(() => {
    if (overlayMode === 'none') {
      setOverlayMode('ledger');
      return;
    }
    if (overlayMode === 'ledger') {
      setOverlayMode('none');
      return;
    }
    if (overlayMode === 'risk') {
      setOverlayMode('both');
      return;
    }
    setOverlayMode('risk');
  }, [overlayMode, setOverlayMode]);

  const handleAddSwimlane = useCallback(() => {
    addSwimlane();
  }, [addSwimlane]);

  const handleRemoveSwimlane = useCallback((indexToRemove: number) => {
    removeSwimlane(indexToRemove);
  }, [removeSwimlane]);

  const handleUpdateSwimlaneLabel = useCallback((indexToUpdate: number, label: string) => {
    updateSwimlaneLabel(indexToUpdate, label);
  }, [updateSwimlaneLabel]);

  useEffect(() => {
    if (laneGroupingMode === 'manual') return;
    const labels = getLaneLabelsForMode(laneGroupingMode);
    if (labels.length >= 2) {
      setSwimlaneLabels(labels);
    }
    setShowSwimlanes(true);
    setNodes((prev) =>
      prev.map((node) => {
        const laneId = getLaneIdForNode(node, laneGroupingMode);
        if (!laneId || node.swimlaneId === laneId) return node;
        return { ...node, swimlaneId: laneId };
      })
    );
  }, [laneGroupingMode, setShowSwimlanes, setSwimlaneLabels]);

  const handleResetCanvas = useCallback(() => {
    const shouldReset = window.confirm(
      'Reset to starter template now? A recovery snapshot of your current canvas will be saved first so you can restore it.'
    );
    if (!shouldReset) return;

    saveRecoverySnapshot();
    pushHistory();
    applySnapshot(STARTER_SNAPSHOT);
    setViewport({ x: 0, y: 0, zoom: 1 });
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setIsInspectorOpen(false);
    pushToast('Canvas reset to starter template. Backup saved.', 'success');
  }, [applySnapshot, pushHistory, pushToast, saveRecoverySnapshot]);

  const handleRestoreRecovery = useCallback(() => {
    const recoveryDiagram = loadDiagramFromStorage(RECOVERY_STORAGE_KEY);
    if (!recoveryDiagram) {
      pushToast(
        'No recovery snapshot yet. Make a change, then use Reset or Import to create a backup you can restore.',
        'warning'
      );
      setHasRecoverySnapshot(false);
      setRecoveryLastSavedAt(null);
      return;
    }

    pushHistory();
    applySnapshot(recoveryDiagram);
    const recoveryLayout = loadLayoutFromStorage(RECOVERY_LAYOUT_STORAGE_KEY);
    if (recoveryLayout) {
      applyLayoutSettings(recoveryLayout);
    }
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setIsInspectorOpen(false);
    setHasRecoverySnapshot(true);
    setRecoveryLastSavedAt(loadRecoveryMeta()?.lastSavedAt || null);
    pushToast('Recovery snapshot restored.', 'success');
  }, [applyLayoutSettings, applySnapshot, pushHistory, pushToast]);

  const handleImportDiagram = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const raw = await file.text();
        const parsed = parseImportPayload(JSON.parse(raw));
        if (!parsed) {
          throw new Error('Unsupported file format.');
        }

        saveRecoverySnapshot();
        pushHistory();
        applySnapshot(parsed.diagram);
        setSelectedNodeIds([]);
        setSelectedEdgeId(null);
        setIsInspectorOpen(false);

        if (parsed.layout) {
          applyLayoutSettings(parsed.layout);
        }
        pushToast('Diagram imported successfully. Backup saved.', 'success');
      } catch (error) {
        console.error('Import failed:', error);
        pushToast('Import failed. Use a valid FinFlow JSON export file.', 'error');
      } finally {
        event.target.value = '';
      }
    },
    [applyLayoutSettings, applySnapshot, pushHistory, pushToast, saveRecoverySnapshot]
  );

  const handleExportDiagram = useCallback(() => {
    const payload: ExportPayloadV2 = createExportPayload(getCurrentSnapshot(), getCurrentLayout());
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finflow-diagram-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Diagram exported successfully.', 'success');
  }, [getCurrentLayout, getCurrentSnapshot, pushToast]);

  const handleExportPng = useCallback(async () => {
    if (!exportLayerRef.current) {
      pushToast('PNG export failed: canvas layer is not ready.', 'error');
      return;
    }

    try {
      await downloadPngExport({
        worldElement: exportLayerRef.current,
        nodes,
        isDarkMode
      });
      pushToast('PNG exported successfully.', 'success');
    } catch (error) {
      console.error('PNG export failed:', error);
      pushToast('PNG export failed. Try again.', 'error');
    }
  }, [isDarkMode, nodes, pushToast]);

  const handleExportSvg = useCallback(async () => {
    if (!exportLayerRef.current) {
      pushToast('SVG export failed: canvas layer is not ready.', 'error');
      return;
    }

    try {
      await downloadSvgExport({
        worldElement: exportLayerRef.current,
        nodes,
        isDarkMode
      });
      pushToast('SVG exported successfully.', 'success');
    } catch (error) {
      console.error('SVG export failed:', error);
      pushToast('SVG export failed. Try again.', 'error');
    }
  }, [isDarkMode, nodes, pushToast]);

  const handleExportPdf = useCallback(async () => {
    if (!exportLayerRef.current) {
      pushToast('PDF export failed: canvas layer is not ready.', 'error');
      return;
    }

    try {
      await downloadPdfExport({
        worldElement: exportLayerRef.current,
        nodes,
        isDarkMode
      });
      pushToast('PDF exported successfully.', 'success');
    } catch (error) {
      console.error('PDF export failed:', error);
      pushToast('PDF export failed. Try again.', 'error');
    }
  }, [isDarkMode, nodes, pushToast]);

  const hasSelectedEdge = !!selectedEdgeId && edges.some((edge) => edge.id === selectedEdgeId);

  const handleSetSelectedEdgeStyle = useCallback(
    (style: 'solid' | 'dashed' | 'dotted') => {
      setActiveEdgeStyle(style);
      if (!selectedEdgeId) return;
      const edge = edges.find((candidate) => candidate.id === selectedEdgeId);
      if (!edge) return;
      handleUpdateEdge({ ...edge, style });
    },
    [edges, handleUpdateEdge, selectedEdgeId]
  );

  const handleToggleSelectedArrowHead = useCallback(() => {
    if (!selectedEdgeId) return;
    const nextConfig = { ...activeArrowConfig, showArrowHead: !activeArrowConfig.showArrowHead };
    setActiveArrowConfig(nextConfig);
    const edge = edges.find((candidate) => candidate.id === selectedEdgeId);
    if (!edge) return;
    handleUpdateEdge({ ...edge, ...nextConfig });
  }, [activeArrowConfig, edges, handleUpdateEdge, selectedEdgeId]);

  const handleToggleSelectedMidArrow = useCallback(() => {
    if (!selectedEdgeId) return;
    const nextConfig = { ...activeArrowConfig, showMidArrow: !activeArrowConfig.showMidArrow };
    setActiveArrowConfig(nextConfig);
    const edge = edges.find((candidate) => candidate.id === selectedEdgeId);
    if (!edge) return;
    handleUpdateEdge({ ...edge, ...nextConfig });
  }, [activeArrowConfig, edges, handleUpdateEdge, selectedEdgeId]);

  const handleZoomIn = useCallback(() => {
    setViewport((prev) => ({ ...prev, zoom: Math.min(2.5, prev.zoom * 1.12) }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setViewport((prev) => ({ ...prev, zoom: Math.max(0.3, prev.zoom * 0.9) }));
  }, []);

  const handleOpenCanvasControls = useCallback(() => {
    setInspectorTabRequest('canvas');
    setIsInspectorOpen(true);
    if (isMobileViewport) {
      setIsSidebarOpen(false);
    }
  }, [isMobileViewport]);

  const floatingContextAnchor = useCallback((): { x: number; y: number } | null => {
    const clampAnchor = (x: number, y: number) => {
      if (!containerRef.current) return { x, y };
      const rect = containerRef.current.getBoundingClientRect();
      const trayHalfWidth = hasSelectedEdge
        ? 210
        : selectedNodeIds.length >= 3
          ? 220
          : selectedNodeIds.length >= 2
            ? 190
            : 130;
      const horizontalPadding = 12;
      const minAnchorX = horizontalPadding + trayHalfWidth;
      const maxAnchorX = rect.width - horizontalPadding - trayHalfWidth;
      const verticalPadding = 18;
      // Keep contextual tray clear of the persistent bottom dock plus a safety gap.
      const dockTopInset = isMobileViewport ? 118 : 126;
      const trayHeight = 52;
      const trayGap = 12;
      const bottomReserved = dockTopInset + trayHeight + trayGap;
      let clampedX = x;
      if (maxAnchorX > minAnchorX) {
        clampedX = Math.min(maxAnchorX, Math.max(minAnchorX, x));
      } else {
        clampedX = rect.width / 2;
      }
      let clampedY = Math.min(rect.height - bottomReserved, Math.max(verticalPadding, y));

      // Avoid overlap with the minimap region in the bottom-right corner.
      if (showMinimap && clampedX > rect.width - 240 && clampedY > rect.height - 200) {
        clampedX = rect.width - 260;
        clampedY = rect.height - 210;
      }

      return { x: clampedX, y: clampedY };
    };

    if (selectedNodeIds.length > 0) {
      const selected = nodes.filter((node) => selectedNodeIds.includes(node.id));
      if (selected.length === 0) return null;

      const bounds = selected.reduce(
        (acc, node) => {
          const { width, height } = getNodeDimensions(node);
          return {
            minX: Math.min(acc.minX, node.position.x),
            minY: Math.min(acc.minY, node.position.y),
            maxX: Math.max(acc.maxX, node.position.x + width),
            maxY: Math.max(acc.maxY, node.position.y + height)
          };
        },
        {
          minX: Number.POSITIVE_INFINITY,
          minY: Number.POSITIVE_INFINITY,
          maxX: Number.NEGATIVE_INFINITY,
          maxY: Number.NEGATIVE_INFINITY
        }
      );

      return clampAnchor(
        ((bounds.minX + bounds.maxX) / 2) * viewport.zoom + viewport.x,
        bounds.minY * viewport.zoom + viewport.y - 10
      );
    }

    if (selectedEdgeId) {
      const edge = edges.find((candidate) => candidate.id === selectedEdgeId);
      if (!edge) return null;
      const source = nodes.find((node) => node.id === edge.sourceId);
      const target = nodes.find((node) => node.id === edge.targetId);
      if (!source || !target) return null;
      const sourceCenter = getNodeCenter(source);
      const targetCenter = getNodeCenter(target);
      return clampAnchor(
        ((sourceCenter.x + targetCenter.x) / 2) * viewport.zoom + viewport.x,
        ((sourceCenter.y + targetCenter.y) / 2) * viewport.zoom + viewport.y - 22
      );
    }

    return null;
  }, [edges, hasSelectedEdge, isMobileViewport, nodes, selectedEdgeId, selectedNodeIds, showMinimap, viewport.x, viewport.y, viewport.zoom]);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      return {
        x: (clientX - rect.left - viewport.x) / viewport.zoom,
        y: (clientY - rect.top - viewport.y) / viewport.zoom
      };
    },
    [viewport]
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    if (!worldPos) return;

    const droppedTool = e.dataTransfer.getData(CONNECTOR_DRAG_TYPE);
    if (droppedTool === CONNECTOR_DRAG_VALUE) {
      handleAddConnector(worldPos);
      return;
    }

    const type = e.dataTransfer.getData('application/finflow/type') as EntityType;
    if (type) {
      handleAddNode(type, { x: worldPos.x - 90, y: worldPos.y - 30 });
    }
  }, [screenToWorld, handleAddConnector, handleAddNode]);

  // Fix: Improved handleGenerateFlow using recommended responseSchema and proper text property access
  const handleGenerateFlow = async () => {
    if (!isAIEnabled) return;
    if (!aiPrompt.trim()) return;
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      pushToast('AI is enabled but VITE_GEMINI_API_KEY is not set.', 'warning');
      return;
    }
    setIsAILoading(true);
    try {
      const { GoogleGenAI, Type } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Architect a professional fintech fund flow for the following scenario: "${aiPrompt}". 
        Include relevant entities like Sponsor Banks, Processors, Networks, and Consumers/Merchants.
        Define clear rails like ACH, RTP, or Card Network.
        Return a valid JSON object.`,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    type: { type: Type.STRING },
                    label: { type: Type.STRING },
                    position: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER }
                      },
                      required: ['x', 'y']
                    }
                  },
                  required: ['id', 'type', 'label', 'position']
                }
              },
              edges: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    sourceId: { type: Type.STRING },
                    targetId: { type: Type.STRING },
                    rail: { type: Type.STRING },
                    label: { type: Type.STRING }
                  },
                  required: ['id', 'sourceId', 'targetId', 'rail', 'label']
                }
              }
            },
            required: ['nodes', 'edges']
          }
        }
      });
      
      const text = response.text;
      if (!text) throw new Error('Empty response from AI');
      
      const parsed = JSON.parse(text) as { nodes?: unknown; edges?: unknown };
      const generatedNodes = Array.isArray(parsed.nodes) ? parsed.nodes.filter(isGeneratedNode) : [];
      const generatedEdges = Array.isArray(parsed.edges) ? parsed.edges.filter(isGeneratedEdge) : [];
      if (generatedNodes.length === 0 || generatedEdges.length === 0) {
        throw new Error('AI response did not include valid nodes/edges.');
      }

      saveRecoverySnapshot();
      pushHistory();
      setNodes(
        generatedNodes.map((node) => {
          const safeType = isValidEntityType(node.type) ? node.type : EntityType.PROCESSOR;
          return {
            id: node.id,
            type: safeType,
            label: node.label,
            position: node.position,
            zIndex: 100,
            swimlaneId: Math.floor(Math.max(0, node.position.y) / 300) + 1,
            shape: safeType === EntityType.GATE ? NodeShape.DIAMOND : NodeShape.RECTANGLE
          } satisfies Node;
        })
      );
      setEdges(
        generatedEdges.map((edge) => ({
          id: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          sourcePortIdx: 1,
          targetPortIdx: 3,
          rail: edge.rail && isValidPaymentRail(edge.rail) ? edge.rail : PaymentRail.BLANK,
          direction: FlowDirection.PUSH,
          label: edge.label,
          isFX: false,
          style: 'solid',
          showArrowHead: true,
          pathType: 'bezier',
          thickness: 2
        } satisfies Edge))
      );
    } catch (error) { 
      console.error('AI Flow Generation Error:', error);
      pushToast('AI generation failed. Check configuration and try again.', 'error');
    } finally { 
      setIsAILoading(false); 
      setAiPrompt('');
      setIsAIModalOpen(false);
    }
  };

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(prev => prev.slice(0, -1));
    setFuture(prev => [getCurrentSnapshot(), ...prev]);
    applySnapshot(previous);
  }, [past, getCurrentSnapshot, applySnapshot]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(prev => prev.slice(1));
    setPast(prev => [...prev, getCurrentSnapshot()]);
    applySnapshot(next);
  }, [future, getCurrentSnapshot, applySnapshot]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const key = event.key.toLowerCase();
      const isMetaOrCtrl = event.metaKey || event.ctrlKey;

      if (event.key === '?' || (event.key === '/' && event.shiftKey)) {
        event.preventDefault();
        openHelp();
        return;
      }

      if (isMetaOrCtrl && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if ((isMetaOrCtrl && key === 'z' && event.shiftKey) || (event.ctrlKey && key === 'y')) {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (isMetaOrCtrl && key === 'd' && selectedNodeIds.length > 0) {
        event.preventDefault();
        handleDuplicateSelection();
        return;
      }

      if ((event.key === 'Delete' || event.key === 'Backspace') && (selectedNodeIds.length > 0 || selectedEdgeId)) {
        event.preventDefault();
        handleDelete();
        return;
      }

      if (selectedNodeIds.length > 0) {
        const step = event.shiftKey ? 10 : 1;
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          moveSelectedNodesBy(0, -step);
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          moveSelectedNodesBy(0, step);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          moveSelectedNodesBy(-step, 0);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          moveSelectedNodesBy(step, 0);
        }
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [handleDelete, handleDuplicateSelection, handleRedo, handleUndo, moveSelectedNodesBy, openHelp, selectedEdgeId, selectedNodeIds]);

  const canGenerateFlow = isAIEnabled && aiPrompt.trim().length > 0 && !isAILoading;
  const prefetchAIModule = useCallback(() => {
    if (!isAIEnabled) return;
    void import('@google/genai');
  }, [isAIEnabled]);
  const backupStatusTimestamp = formatBackupTimestamp(recoveryLastSavedAt);
  const backupStatusText =
    hasRecoverySnapshot && backupStatusTimestamp
      ? `Backup: Available · last saved ${backupStatusTimestamp}`
      : hasRecoverySnapshot
        ? 'Backup: Available'
        : 'Backup: Not yet created';

  return (
    <div className={`finflow-app-shell flex h-screen flex-col overflow-hidden ${isDarkMode ? 'dark text-slate-100' : 'text-slate-900'}`}>
      <TopBar
        isDarkMode={isDarkMode}
        nodesCount={nodes.length}
        edgesCount={edges.length}
        backupStatusText={backupStatusText}
        hasRecoverySnapshot={hasRecoverySnapshot}
        recoveryLastSavedAt={recoveryLastSavedAt}
        feedbackHref={feedbackHref}
        storageWarning={storageWarning}
        isSidebarOpen={isSidebarOpen}
        isInspectorOpen={isInspectorOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onToggleInspector={() => setIsInspectorOpen((prev) => !prev)}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        onOpenHelp={openHelp}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onOpenCanvasControls={handleOpenCanvasControls}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        isAIEnabled={isAIEnabled}
        isAILoading={isAILoading}
        onOpenAiLauncher={() => {
          prefetchAIModule();
          setIsAIModalOpen(true);
        }}
        onRestoreRecovery={handleRestoreRecovery}
        onResetCanvas={handleResetCanvas}
        onImportDiagram={() => importInputRef.current?.click()}
        onExportDiagram={handleExportDiagram}
        onExportSvg={handleExportSvg}
        onExportPng={handleExportPng}
        onExportPdf={handleExportPdf}
      />

      <input
        ref={importInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImportDiagram}
      />

      <ShortcutsModal isOpen={isShortcutsOpen} onClose={() => setIsShortcutsOpen(false)} isDarkMode={isDarkMode} />

      {isAIEnabled && isAIModalOpen ? (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="AI flow generator"
            className={`w-full max-w-xl rounded-2xl border p-4 shadow-2xl ${
              isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="ui-section-title">AI Generator</div>
                <h3 className="mt-1 text-base font-semibold tracking-tight">Generate a flow from a prompt</h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Describe your scenario and FinFlow will draft entities, rails, and links.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAIModalOpen(false)}
                className="status-chip !h-8 !w-8 !px-0"
                aria-label="Close AI generator"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative">
              <Sparkles
                className={`pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-cyan-500 ${
                  isAILoading ? 'animate-pulse' : 'opacity-80'
                }`}
              />
              <textarea
                autoFocus
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && canGenerateFlow) {
                    event.preventDefault();
                    void handleGenerateFlow();
                  }
                }}
                onFocus={prefetchAIModule}
                rows={4}
                placeholder="Example: consumer card purchase with sponsor bank settlement via processor and card network."
                className="ui-input w-full resize-none rounded-xl py-3 pl-10 pr-3 text-sm"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Use Cmd/Ctrl+Enter to generate.</div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAIModalOpen(false)}
                  className="ui-button-secondary px-3 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onMouseEnter={prefetchAIModule}
                  onClick={() => void handleGenerateFlow()}
                  disabled={!canGenerateFlow}
                  className="ui-button-primary inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Bot className="h-4 w-4" />
                  {isAILoading ? 'Generating...' : 'Generate Flow'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        data-testid="toast-container"
        className="pointer-events-none fixed right-3 top-[5.25rem] z-[120] flex w-[min(92vw,28rem)] flex-col gap-2"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-testid="toast-message"
            role={toast.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto rounded-lg border px-3 py-2 text-sm shadow-lg ${
              toast.tone === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : toast.tone === 'warning'
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : toast.tone === 'error'
                    ? 'border-rose-300 bg-rose-50 text-rose-800'
                    : 'border-slate-300 bg-white text-slate-700'
            }`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      <main className="relative flex flex-1 overflow-hidden px-2 pb-2 pt-2 md:px-3">
        {isMobileViewport && (isSidebarOpen || isInspectorOpen) && (
          <button
            type="button"
            aria-label="Close side panels"
            onClick={() => {
              setIsSidebarOpen(false);
              setIsInspectorOpen(false);
            }}
            className="absolute inset-0 z-20 bg-slate-900/20 backdrop-blur-[1px]"
          />
        )}

        <div
          className={`flex flex-col overflow-hidden rounded-2xl border transition-all duration-200 ${
            isMobileViewport
              ? `absolute inset-y-0 left-0 z-40 w-[min(92vw,22rem)] transform ${
                  isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-[110%]'
                }`
              : `${isSidebarOpen ? 'w-[22rem]' : 'w-[3.5rem]'} relative z-30`
          } ${isDarkMode ? 'border-slate-700 bg-slate-900/95' : 'border-slate-200 bg-white/95'}`}
        >
          <Sidebar
            onAddNode={(type) => {
              handleAddNode(type);
              if (isMobileViewport) {
                setIsSidebarOpen(false);
              }
            }}
            isDarkMode={isDarkMode}
            overlayMode={overlayMode}
            onToggleRiskOverlay={handleToggleRiskOverlay}
            onToggleLedgerOverlay={handleToggleLedgerOverlay}
            isExpanded={isSidebarOpen}
            onToggleExpanded={() => setIsSidebarOpen((prev) => !prev)}
          />
        </div>

        <div
          className={`relative ${isMobileViewport ? 'mx-0' : 'mx-2'} flex-1 overflow-hidden rounded-2xl border ${
            isDarkMode ? 'border-slate-700 bg-slate-900/85' : 'border-slate-200 bg-white/80'
          }`}
          data-testid="canvas-dropzone"
          ref={containerRef}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
        >
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            drawings={drawings}
            selectedNodeIds={selectedNodeIds}
            selectedEdgeId={selectedEdgeId}
            onSelectNodes={handleSelectNodes}
            onSelectEdge={handleSelectEdge}
            onUpdateNodePosition={handleUpdateNodePosition}
            onBeginNodeMove={(_ids) => pushHistory()}
            onConnect={handleConnect}
            isDarkMode={isDarkMode}
            showPorts={showPorts}
            snapToGrid={snapToGrid}
            activeTool={activeTool}
            onAddDrawing={handleAddDrawing}
            onOpenInspector={() => {
              if (selectedNodeIds.length <= 1) {
                setIsInspectorOpen(true);
                if (isMobileViewport) {
                  setIsSidebarOpen(false);
                }
              }
            }}
            onAddNode={handleAddNode}
            showSwimlanes={showSwimlanes}
            swimlaneLabels={swimlaneLabels}
            gridMode={gridMode}
            overlayMode={overlayMode}
            showMinimap={showMinimap}
            viewport={viewport}
            onViewportChange={setViewport}
            exportLayerRef={exportLayerRef}
          />

          <div className="absolute left-2 top-2 z-20 max-w-[calc(100%-1rem)] md:left-3 md:top-3">
            {isQuickStartVisible && (
              <div
                data-testid="quickstart-panel"
                className={`mb-2 w-[min(22rem,calc(100vw-1rem))] rounded-lg border px-3 py-3 shadow-sm ${
                  isDarkMode ? 'border-blue-500/30 bg-slate-900 text-slate-100' : 'border-blue-200 bg-white text-slate-700'
                }`}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">Quick Start</h2>
                    <p className="mt-1 text-[11px] leading-relaxed">Complete this MVP flow once:</p>
                  </div>
                  <button
                    data-testid="quickstart-dismiss"
                    onClick={dismissQuickStart}
                    className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${
                      isDarkMode ? 'border-slate-700 text-slate-200 hover:bg-slate-800' : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Dismiss
                  </button>
                </div>
                <ol className="space-y-1 pl-4 text-[11px]">
                  <li>1. Add or edit a node/connector.</li>
                  <li>2. Click <span className="mono">Export JSON</span>.</li>
                  <li>3. Click <span className="mono">Reset</span>, then <span className="mono">Import JSON</span> to restore.</li>
                </ol>
              </div>
            )}
            <div
              className={`pointer-events-none hidden rounded-md border px-3 py-2 text-[11px] font-medium shadow-sm md:block ${
                isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-white text-slate-600'
              }`}
            >
              Tip: Shift-click or drag-select for multi-select, hold <span className="mono">Space</span> to pan, use <span className="mono">Cmd/Ctrl+D</span> to duplicate.
            </div>
          </div>

          <FloatingContextBar
            isDarkMode={isDarkMode}
            isMobileViewport={isMobileViewport}
            anchor={floatingContextAnchor()}
            activeTool={activeTool}
            onSetActiveTool={setActiveTool}
            onAutoConnectEdge={handleAutoConnectEdge}
            onAddConnector={() => handleAddConnector()}
            onConnectorNativeDragStart={handleConnectorNativeDragStart}
            onDelete={handleDelete}
            onDuplicateSelection={handleDuplicateSelection}
            onAlignLeft={() => handleAlignSelectedNodes('left')}
            onAlignCenter={() => handleAlignSelectedNodes('center')}
            onAlignRight={() => handleAlignSelectedNodes('right')}
            onDistribute={handleDistributeSelectedNodes}
            selectedNodeCount={selectedNodeIds.length}
            hasSelectedEdge={hasSelectedEdge}
            activeEdgeStyle={activeEdgeStyle}
            onSetEdgeStyle={handleSetSelectedEdgeStyle}
            arrowHeadEnabled={activeArrowConfig.showArrowHead}
            midArrowEnabled={activeArrowConfig.showMidArrow}
            onToggleArrowHead={handleToggleSelectedArrowHead}
            onToggleMidArrow={handleToggleSelectedMidArrow}
          />

        </div>

        <div
          className={`overflow-hidden rounded-2xl border transition-[width,transform,opacity] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
            isMobileViewport
              ? `absolute inset-y-0 right-0 z-40 w-[min(92vw,340px)] transform ${
                  isInspectorOpen ? 'translate-x-0 opacity-100 shadow-xl' : 'translate-x-[110%] opacity-0'
                }`
              : `${isInspectorOpen ? 'w-[340px] translate-x-0 opacity-100' : 'w-0 translate-x-2 opacity-0'} relative z-30`
          } ${isDarkMode ? 'border-slate-700 bg-slate-800/95' : 'border-slate-200 bg-white/95'}`}
        >
          {isInspectorOpen && (
            <Inspector
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onUpdateNode={handleUpdateNode}
              onUpdateEdge={handleUpdateEdge}
              isDarkMode={isDarkMode}
              onClose={() => setIsInspectorOpen(false)}
              showSwimlanes={showSwimlanes}
              onToggleSwimlanes={handleToggleSwimlanes}
              swimlaneLabels={swimlaneLabels}
              onAddSwimlane={handleAddSwimlane}
              onRemoveSwimlane={handleRemoveSwimlane}
              onUpdateSwimlaneLabel={handleUpdateSwimlaneLabel}
              gridMode={gridMode}
              onSetGridMode={setGridMode}
              snapToGrid={snapToGrid}
              onToggleSnapToGrid={() => setSnapToGrid((prev) => !prev)}
              showPorts={showPorts}
              onTogglePorts={toggleShowPorts}
              showMinimap={showMinimap}
              onToggleMinimap={() => setShowMinimap((prev) => !prev)}
              laneGroupingMode={laneGroupingMode}
              onSetLaneGroupingMode={setLaneGroupingMode}
              hasRecoverySnapshot={hasRecoverySnapshot}
              onRestoreRecovery={handleRestoreRecovery}
              onResetCanvas={handleResetCanvas}
              onImportDiagram={() => importInputRef.current?.click()}
              onExportDiagram={handleExportDiagram}
              onExportSvg={handleExportSvg}
              onExportPng={handleExportPng}
              onExportPdf={handleExportPdf}
              activeTabRequest={inspectorTabRequest}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
