
import React, { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  Trash2,
  Download,
  Upload,
  RotateCcw,
  RotateCw,
  RefreshCw,
  LifeBuoy,
  AlertTriangle,
  Sun,
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  MousePointer2,
  Pencil,
  Type as TypeIcon,
  Minus,
  Divide,
  MoreHorizontal,
  ArrowRight,
  ArrowRightLeft,
  CircleDot,
  Rows3,
  Plus,
  X
} from 'lucide-react';
import FlowCanvas from './components/FlowCanvas';
import Sidebar from './components/Sidebar';
import Inspector from './components/Inspector';
import {
  Node,
  Edge,
  EntityType,
  PaymentRail,
  DrawingPath,
  FlowDirection,
  NodeShape,
  ViewportTransform,
  DiagramSnapshot,
  LayoutSettings,
  ExportPayloadV2,
  GridMode
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
      position: { x: 360, y: 320 },
      zIndex: 10,
      swimlaneId: 2
    },
    {
      id: 'starter-processor',
      type: EntityType.PROCESSOR,
      label: 'Processor',
      shape: NodeShape.RECTANGLE,
      position: { x: 680, y: 320 },
      zIndex: 10,
      swimlaneId: 2
    },
    {
      id: 'starter-network',
      type: EntityType.NETWORK,
      label: 'Card Network',
      shape: NodeShape.RECTANGLE,
      position: { x: 1000, y: 320 },
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

const getDiagramValidationWarnings = (snapshot: DiagramSnapshot): string[] => {
  const warnings: string[] = [];
  const validationNodes = snapshot.nodes.filter(
    (node) => !node.isConnectorHandle && node.type !== EntityType.TEXT_BOX
  );
  if (validationNodes.length === 0) return warnings;

  const nodeIds = new Set(validationNodes.map((node) => node.id));
  const linkedNodeIds = new Set<string>();
  const adjacency = new Map<string, string[]>();
  validationNodes.forEach((node) => adjacency.set(node.id, []));

  snapshot.edges.forEach((edge) => {
    if (!nodeIds.has(edge.sourceId) || !nodeIds.has(edge.targetId)) return;
    adjacency.get(edge.sourceId)?.push(edge.targetId);
    linkedNodeIds.add(edge.sourceId);
    linkedNodeIds.add(edge.targetId);
  });

  const orphanCount = validationNodes.filter((node) => !linkedNodeIds.has(node.id)).length;
  if (orphanCount > 0) {
    warnings.push(`Validation warning: ${orphanCount} unconnected node${orphanCount === 1 ? '' : 's'} in export.`);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  let hasCycle = false;
  const visit = (nodeId: string) => {
    if (hasCycle || visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      hasCycle = true;
      return;
    }
    visiting.add(nodeId);
    const nextIds = adjacency.get(nodeId) || [];
    nextIds.forEach(visit);
    visiting.delete(nodeId);
    visited.add(nodeId);
  };
  validationNodes.forEach((node) => visit(node.id));
  if (hasCycle) {
    warnings.push('Validation warning: Circular loop detected in flow graph.');
  }

  return warnings;
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
type AddNodeOptions = {
  animateDrop?: boolean;
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

const DraggableConnectorButton: React.FC<{
  onClick: () => void;
  onNativeDragStart: (event: React.DragEvent<HTMLButtonElement>) => void;
}> = ({ onClick, onNativeDragStart }) => {
  return (
    <button
      data-testid="toolbar-insert-connector"
      draggable
      onDragStart={onNativeDragStart}
      onClick={onClick}
      aria-label="Insert connector"
      className="ff-btn-secondary ff-focus ff-toolbar-btn flex cursor-grab items-center gap-1 border border-transparent px-2.5 text-xs font-medium active:cursor-grabbing"
      title="Click to insert connector at center, or drag into canvas"
    >
      <ArrowRight className="h-4 w-4" />
      <span>Connector</span>
    </button>
  );
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
  const isLayoutPanelOpen = useUIStore((state) => state.isLayoutPanelOpen);
  const setIsLayoutPanelOpen = useUIStore((state) => state.setIsLayoutPanelOpen);
  const toggleLayoutPanel = useUIStore((state) => state.toggleLayoutPanel);
  const activeTool = useUIStore((state) => state.activeTool);
  const setActiveTool = useUIStore((state) => state.setActiveTool);
  const [isArrangeControlsOpen, setIsArrangeControlsOpen] = useState(false);
  const [isEdgeControlsOpen, setIsEdgeControlsOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAILoading, setIsAILoading] = useState(false);
  const [isQuickStartVisible, setIsQuickStartVisible] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY) !== 'true';
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [viewport, setViewport] = useState<ViewportTransform>({ x: 0, y: 0, zoom: 1 });
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [hasRecoverySnapshot, setHasRecoverySnapshot] = useState(false);
  const [recoveryLastSavedAt, setRecoveryLastSavedAt] = useState<string | null>(null);
  const [activeDropNodeId, setActiveDropNodeId] = useState<string | null>(null);
  const [recentlyConnectedEdgeId, setRecentlyConnectedEdgeId] = useState<string | null>(null);
  
  // Link Attributes State
  const [activeEdgeStyle, setActiveEdgeStyle] = useState<'solid' | 'dashed' | 'dotted'>('solid');
  const [activeArrowConfig, setActiveArrowConfig] = useState({ showArrowHead: true, showMidArrow: false });

  const [past, setPast] = useState<DiagramSnapshot[]>([]);
  const [future, setFuture] = useState<DiagramSnapshot[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const lastNodeEditRef = useRef<EditMergeState>({ id: null, at: 0 });
  const lastEdgeEditRef = useRef<EditMergeState>({ id: null, at: 0 });
  const lastNudgeRef = useRef<EditMergeState>({ id: null, at: 0 });
  const hasLoadedFromStorage = useRef(false);
  const saveLayoutTimeoutRef = useRef<number | null>(null);
  const dropAnimationTimeoutRef = useRef<number | null>(null);
  const edgeHighlightTimeoutRef = useRef<number | null>(null);
  const latestSnapshotRef = useRef<DiagramSnapshot>(STARTER_SNAPSHOT);
  const latestLayoutRef = useRef<LayoutSettings>({
    showSwimlanes,
    swimlaneLabels,
    gridMode,
    isDarkMode,
    showPorts
  });
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

  const openQuickStart = useCallback(() => {
    setIsQuickStartVisible(true);
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
      setIsSidebarOpen(true);
    }
    wasMobileViewportRef.current = isMobileViewport;
  }, [isMobileViewport]);

  useEffect(() => {
    return () => {
      if (dropAnimationTimeoutRef.current !== null) {
        window.clearTimeout(dropAnimationTimeoutRef.current);
      }
      if (edgeHighlightTimeoutRef.current !== null) {
        window.clearTimeout(edgeHighlightTimeoutRef.current);
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

  const flushAutosaveNow = useCallback(() => {
    if (!hasLoadedFromStorage.current) return;
    if (saveLayoutTimeoutRef.current !== null) {
      window.clearTimeout(saveLayoutTimeoutRef.current);
      saveLayoutTimeoutRef.current = null;
    }

    const layoutSaved = persistLayoutToStorage(LAYOUT_STORAGE_KEY, latestLayoutRef.current);

    if (!layoutSaved) {
      setStorageWarning('Layout autosave is unavailable. Your view preferences may not persist.');
    }
  }, []);

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

  useLayoutEffect(() => {
    latestSnapshotRef.current = getCurrentSnapshot();
  }, [getCurrentSnapshot]);

  useLayoutEffect(() => {
    latestLayoutRef.current = getCurrentLayout();
  }, [getCurrentLayout]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAutosaveNow();
      }
    };

    window.addEventListener('beforeunload', flushAutosaveNow);
    window.addEventListener('pagehide', flushAutosaveNow);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('beforeunload', flushAutosaveNow);
      window.removeEventListener('pagehide', flushAutosaveNow);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushAutosaveNow]);

  useLayoutEffect(() => {
    if (!hasLoadedFromStorage.current) return;
    const current = getCurrentSnapshot();
    latestSnapshotRef.current = current;
    const saved = persistDiagramToStorage(STORAGE_KEY, current);
    if (!saved) {
      setStorageWarning('Autosave is unavailable. Your changes may not persist after refresh.');
    }
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

  const handleSelectEdge = useCallback((id: string | null) => {
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

  const handleAddNode = useCallback((type: EntityType, pos?: { x: number; y: number }, options?: AddNodeOptions) => {
    pushHistory();
    let insertedNodeId: string | null = null;
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

      const newNodeId = createId('node');
      insertedNodeId = newNodeId;
      const newNode: Node = {
        id: newNodeId,
        type,
        label: type,
        shape: type === EntityType.GATE ? NodeShape.DIAMOND : NodeShape.RECTANGLE,
        position: finalPos,
        zIndex: 100,
        swimlaneId: Math.floor(Math.max(0, finalPos.y) / 300) + 1
      };
      return [...prev, newNode];
    });

    if (options?.animateDrop && insertedNodeId) {
      setActiveDropNodeId(insertedNodeId);
      if (dropAnimationTimeoutRef.current !== null) {
        window.clearTimeout(dropAnimationTimeoutRef.current);
      }
      dropAnimationTimeoutRef.current = window.setTimeout(() => {
        setActiveDropNodeId(null);
      }, 240);
    }
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
    setRecentlyConnectedEdgeId(newEdgeId);
    if (edgeHighlightTimeoutRef.current !== null) {
      window.clearTimeout(edgeHighlightTimeoutRef.current);
    }
    edgeHighlightTimeoutRef.current = window.setTimeout(() => {
      setRecentlyConnectedEdgeId(null);
    }, 780);
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

  const handleAddSwimlane = useCallback(() => {
    addSwimlane();
  }, [addSwimlane]);

  const handleRemoveSwimlane = useCallback((indexToRemove: number) => {
    removeSwimlane(indexToRemove);
  }, [removeSwimlane]);

  const handleUpdateSwimlaneLabel = useCallback((indexToUpdate: number, label: string) => {
    updateSwimlaneLabel(indexToUpdate, label);
  }, [updateSwimlaneLabel]);

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
        const validationWarnings = getDiagramValidationWarnings(parsed.diagram);

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
        validationWarnings.forEach((warning) => pushToast(warning, 'warning'));
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
    const snapshot = getCurrentSnapshot();
    const layout = getCurrentLayout();
    const validationWarnings = getDiagramValidationWarnings(snapshot);
    validationWarnings.forEach((warning) => pushToast(warning, 'warning'));
    const payload: ExportPayloadV2 = createExportPayload(snapshot, layout);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `finflow-diagram-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('Diagram exported successfully.', 'success');
  }, [getCurrentLayout, getCurrentSnapshot, pushToast]);

  const hasSelectedEdge = !!selectedEdgeId && edges.some((edge) => edge.id === selectedEdgeId);

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
      handleAddNode(type, { x: worldPos.x - 90, y: worldPos.y - 30 }, { animateDrop: true });
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
  }, [handleDelete, handleDuplicateSelection, handleRedo, handleUndo, moveSelectedNodesBy, selectedEdgeId, selectedNodeIds]);

  const canGenerateFlow = isAIEnabled && aiPrompt.trim().length > 0 && !isAILoading;
  const prefetchAIModule = useCallback(() => {
    if (!isAIEnabled) return;
    void import('@google/genai');
  }, [isAIEnabled]);
  const handleEditSelectionFromCanvas = useCallback(() => {
    if (selectedNodeIds.length !== 1) return;
    setIsInspectorOpen(true);
    if (isMobileViewport) {
      setIsSidebarOpen(false);
    }
  }, [isMobileViewport, selectedNodeIds.length]);
  const handleDeleteSelectionFromCanvas = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    handleDelete();
  }, [handleDelete, selectedNodeIds.length]);
  const backupStatusTimestamp = formatBackupTimestamp(recoveryLastSavedAt);
  const backupStatusText =
    hasRecoverySnapshot && backupStatusTimestamp
      ? `Backup: Available · last saved ${backupStatusTimestamp}`
      : hasRecoverySnapshot
        ? 'Backup: Available'
        : 'Backup: Not yet created';
  const handleDisclosureToggleKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    toggle: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle((prev) => !prev);
    }
  };

  return (
      <div className={`finflow-app-shell ff-shell flex h-screen flex-col overflow-hidden ${isDarkMode ? 'dark' : ''}`}>
        <header
          data-testid="top-toolbar-panel"
          className="ff-floating-panel ff-motion-in z-40 mx-2 mt-2 flex shrink-0 flex-col gap-3 px-3 py-2 md:mx-3 md:mt-3 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-lg font-bold text-white shadow-sm">
              F
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">FinFlow Builder</h1>
              <p className="ff-muted-text text-[10px] font-bold uppercase tracking-[0.16em]">
                Architect Tool
              </p>
            </div>
            <span className="ff-chip mono hidden lg:inline-flex">
              {nodes.length} nodes | {edges.length} links
            </span>
            <span
              data-testid="backup-status-indicator"
              data-last-saved-at={recoveryLastSavedAt || ''}
              className={`ff-chip ${hasRecoverySnapshot ? 'ff-chip-success' : 'ff-chip-warning'}`}
              title={
                hasRecoverySnapshot && recoveryLastSavedAt
                  ? `Last backup: ${new Date(recoveryLastSavedAt).toLocaleString()}`
                  : 'No backup created yet'
              }
            >
              {backupStatusText}
            </span>
            <a
              href={feedbackHref}
              target="_blank"
              rel="noreferrer"
              className="ff-chip ff-chip-info"
            >
              Feedback
            </a>
            {storageWarning && (
              <span
                role="status"
                className="ff-chip ff-chip-warning hidden items-center gap-1 lg:inline-flex"
                title={storageWarning}
              >
                <AlertTriangle className="h-3 w-3" />
                Autosave issue
              </span>
            )}
          </div>

          <div className="flex-1 md:max-w-xl md:px-6">
            {isAIEnabled ? (
              <div className="group relative">
                <Sparkles
                  className={`absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500 ${
                    isAILoading ? 'animate-pulse' : 'opacity-70'
                  }`}
                />
                <input
                  type="text"
                  placeholder={isAILoading ? 'Drafting flow...' : 'Describe a flow to generate...'}
                  className="ff-input ff-focus h-10 w-full rounded-full pl-10 pr-28 text-sm outline-none"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && canGenerateFlow && handleGenerateFlow()}
                  onFocus={prefetchAIModule}
                />
                <button
                  onClick={handleGenerateFlow}
                  disabled={!canGenerateFlow}
                  onMouseEnter={prefetchAIModule}
                  className="ff-btn-primary absolute right-1.5 top-1.5 h-7 rounded-full px-4 text-[11px] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isAILoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
            ) : (
              <div
                data-testid="ai-disabled-badge"
                className="ff-chip ff-chip-info px-3 py-2 text-xs"
              >
                AI Generate is disabled for public MVP.
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 md:w-auto md:overflow-visible md:pb-0">
            <button
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              aria-pressed={isSidebarOpen}
              className="ff-btn-secondary ff-focus tap-target shrink-0 flex items-center gap-1 px-2.5 py-2 text-[11px] lg:hidden"
            >
              {isSidebarOpen ? 'Hide Library' : 'Library'}
            </button>
            <button
              onClick={() => setIsInspectorOpen((prev) => !prev)}
              aria-pressed={isInspectorOpen}
              className="ff-btn-secondary ff-focus tap-target shrink-0 flex items-center gap-1 px-2.5 py-2 text-[11px] lg:hidden"
            >
              {isInspectorOpen ? 'Hide Inspect' : 'Inspect'}
            </button>

            <div className="ff-panel-muted shrink-0 flex items-center p-1">
              <button
                title="Undo"
                aria-label="Undo"
                onClick={handleUndo}
                disabled={past.length === 0}
                className="ff-btn-ghost ff-focus tap-target rounded-md p-2 disabled:opacity-30"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                title="Redo"
                aria-label="Redo"
                onClick={handleRedo}
                disabled={future.length === 0}
                className="ff-btn-ghost ff-focus tap-target rounded-md p-2 disabled:opacity-30"
              >
                <RotateCw className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-pressed={isDarkMode}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              className="ff-btn-secondary ff-focus tap-target shrink-0 p-2"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              data-testid="toolbar-help-open"
              onClick={openQuickStart}
              aria-label="Open quick start help"
              className="ff-btn-secondary ff-focus tap-target shrink-0 px-2.5 py-2 text-[11px]"
            >
              Help
            </button>
            </div>

            <div
              data-testid="primary-actions-strip"
              className="primary-actions-strip ff-panel-muted px-2 py-1"
            >
              <div className="ff-muted-text mb-1 px-1 text-[10px] font-semibold uppercase tracking-[0.12em]">
                Primary Actions
              </div>
              <div className="primary-actions-grid">
                <button
                  onClick={handleRestoreRecovery}
                  data-testid="toolbar-restore"
                  title={
                    hasRecoverySnapshot
                      ? 'Restore the backup captured before reset/import'
                      : 'No backup yet. Click to see recovery guidance.'
                  }
                  className={`ff-btn-secondary ff-focus tap-target shrink-0 flex items-center gap-2 px-3 py-2 text-xs ${
                    hasRecoverySnapshot ? '' : 'border-amber-400/70 text-amber-700 dark:text-amber-200'
                  }`}
                >
                  <LifeBuoy className="h-4 w-4" />
                  <span>Restore Backup</span>
                </button>

                <button
                  onClick={handleResetCanvas}
                  data-testid="toolbar-reset-canvas"
                  title="Reset to starter template (saves backup first)"
                  className="ff-btn-secondary ff-focus tap-target shrink-0 flex items-center gap-2 px-3 py-2 text-xs"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset</span>
                </button>

                <button
                  data-testid="toolbar-import-json"
                  onClick={() => importInputRef.current?.click()}
                  title="Import FinFlow JSON (current work is backed up first)"
                  className="ff-btn-secondary ff-focus tap-target shrink-0 flex items-center gap-2 px-3 py-2 text-xs"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import JSON</span>
                </button>
                <button
                  data-testid="toolbar-export-json"
                  onClick={handleExportDiagram}
                  title="Export current canvas as FinFlow JSON"
                  className="ff-btn-primary ff-focus tap-target shrink-0 flex items-center gap-2 px-3 py-2 text-xs"
                >
                  <Download className="h-4 w-4" />
                  <span>Export JSON</span>
                </button>
              </div>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImportDiagram}
            />
          </div>
        </header>

        <div
          data-testid="toast-container"
          className="pointer-events-none fixed right-3 top-[5.25rem] z-[120] flex w-[min(92vw,28rem)] flex-col gap-2 ff-motion-in"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              data-testid="toast-message"
              role={toast.tone === 'error' ? 'alert' : 'status'}
              className={`ff-panel pointer-events-auto rounded-md px-3 py-2 text-sm ${
                toast.tone === 'success'
                  ? 'border-emerald-300/70 bg-emerald-50 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-100'
                  : toast.tone === 'warning'
                    ? 'border-amber-300/70 bg-amber-50 text-amber-900 dark:bg-amber-500/15 dark:text-amber-100'
                    : toast.tone === 'error'
                      ? 'border-rose-300/70 bg-rose-50 text-rose-900 dark:bg-rose-500/15 dark:text-rose-100'
                      : ''
              }`}
            >
              {toast.text}
            </div>
          ))}
        </div>

        <main className="relative flex flex-1 overflow-hidden px-2 pb-2 pt-2 md:px-3 md:pb-3 md:pt-3">
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
            data-testid="library-panel"
            className={`flex flex-col overflow-hidden rounded-lg border transition-all duration-300 ${
              isMobileViewport
                ? `absolute inset-y-0 left-0 z-40 w-72 transform ${
                    isSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-[110%]'
                  } transition-transform`
                : `${isSidebarOpen ? 'w-72' : 'w-0'} relative z-30`
            } ff-floating-panel`}
          >
            <Sidebar
              onAddNode={(type) => {
                handleAddNode(type);
                if (isMobileViewport) {
                  setIsSidebarOpen(false);
                }
              }}
              isDarkMode={isDarkMode}
            />
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label={isSidebarOpen ? 'Collapse component library' : 'Expand component library'}
              className="ff-btn-secondary ff-focus absolute -right-3 top-1/2 z-50 hidden h-11 w-6 -translate-y-1/2 items-center justify-center rounded-full px-0 lg:flex"
            >
              {isSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>

          <div
            className={`ff-canvas-surface relative ${isMobileViewport ? 'mx-0' : 'mx-2'} flex-1 overflow-hidden rounded-lg border`}
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
              onUpdateNodePosition={(id, pos) =>
                setNodes((prev) =>
                  prev.map((n) =>
                    n.id === id
                      ? {
                          ...n,
                          position: pos,
                          swimlaneId: Math.floor(Math.max(0, pos.y) / 300) + 1
                        }
                      : n
                  )
                )
              }
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
              onDuplicateSelection={handleDuplicateSelection}
              onDeleteSelection={handleDeleteSelectionFromCanvas}
              onEditSelection={handleEditSelectionFromCanvas}
              highlightedNodeId={activeDropNodeId}
              onAddNode={handleAddNode}
              showSwimlanes={showSwimlanes}
              swimlaneLabels={swimlaneLabels}
              gridMode={gridMode}
              viewport={viewport}
              onViewportChange={setViewport}
              highlightedEdgeId={recentlyConnectedEdgeId}
            />
            <div className="ff-vignette" />

            <div className="absolute left-2 top-2 z-20 max-w-[calc(100%-1rem)] md:left-3 md:top-3">
              {isQuickStartVisible && (
                <div
                  data-testid="quickstart-panel"
                  className="ff-panel ff-elevated ff-motion-in mb-2 w-[min(22rem,calc(100vw-1rem))] border-l-4 border-l-indigo-500 px-3 py-3"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300">
                        Quick Start
                      </h2>
                      <p className="mt-1 text-[11px] leading-relaxed">
                        Complete this MVP flow once:
                      </p>
                    </div>
                    <button
                      data-testid="quickstart-dismiss"
                      onClick={dismissQuickStart}
                      className="ff-btn-secondary ff-focus px-2 py-1 text-[10px]"
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
              {nodes.length === 0 && !isQuickStartVisible && (
                <div
                  data-testid="empty-canvas-state"
                  className="ff-panel ff-elevated ff-motion-in mb-2 w-[min(24rem,calc(100vw-1rem))] border-l-4 border-l-indigo-500 px-3 py-3"
                >
                  <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300">
                    Start Here
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed">
                    Add your first component, then connect and export your flow.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="ff-btn-secondary ff-focus px-2.5 py-1 text-[10px]"
                    >
                      Open Library
                    </button>
                    <button
                      onClick={openQuickStart}
                      className="ff-btn-secondary ff-focus px-2.5 py-1 text-[10px]"
                    >
                      Quick Start
                    </button>
                    <button
                      onClick={() => importInputRef.current?.click()}
                      className="ff-btn-secondary ff-focus px-2.5 py-1 text-[10px]"
                    >
                      Import JSON
                    </button>
                  </div>
                </div>
              )}
              <div
                className="ff-panel-muted ff-muted-text pointer-events-none hidden px-3 py-2 text-[11px] font-medium md:block"
              >
                Tip: Shift-click or drag-select for multi-select, hold <span className="mono">Space</span> to pan, use <span className="mono">Cmd/Ctrl+D</span> to duplicate.
              </div>
            </div>

            <div
              className="pointer-events-none absolute left-1/2 z-30 w-full max-w-6xl -translate-x-1/2 px-2 md:px-4"
              style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
            >
              <div className="flex max-h-[46vh] flex-col items-center gap-2 overflow-y-auto overscroll-contain pb-1 md:max-h-none md:overflow-visible">
                {isLayoutPanelOpen && (
                  <div
                    className="ff-panel surface-ring ff-motion-in pointer-events-auto w-full max-w-4xl p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold">Canvas Layout</h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Toggle swimlanes and switch between none, grid, or dots.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsLayoutPanelOpen(false)}
                        aria-label="Close layout panel"
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Close layout panel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleToggleSwimlanes}
                        aria-pressed={showSwimlanes}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                          showSwimlanes
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                        }`}
                      >
                        {showSwimlanes ? 'Swimlanes: On' : 'Swimlanes: Off'}
                      </button>

                      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                        {[
                          { id: 'none', label: 'None' },
                          { id: 'lines', label: 'Grid' },
                          { id: 'dots', label: 'Dots' }
                        ].map((mode) => (
                          <button
                            key={mode.id}
                            onClick={() => setGridMode(mode.id as 'none' | 'lines' | 'dots')}
                            aria-pressed={gridMode === mode.id}
                            className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                              gridMode === mode.id
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200'
                                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {showSwimlanes && (
                      <div className="space-y-2">
                        <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                          {swimlaneLabels.map((label, idx) => (
                            <div key={`swimlane-label-${idx}`} className="flex items-center gap-2">
                              <span className="w-16 text-[11px] font-semibold text-slate-500">Lane {idx + 1}</span>
                              <input
                                value={label}
                                onChange={(e) => handleUpdateSwimlaneLabel(idx, e.target.value)}
                                placeholder={`Swimlane ${idx + 1}`}
                                className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              />
                              <button
                                onClick={() => handleRemoveSwimlane(idx)}
                                disabled={swimlaneLabels.length <= 2}
                                className="rounded-lg px-2 py-1.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-rose-500/20"
                                title={swimlaneLabels.length <= 2 ? 'Keep at least two lanes' : 'Remove lane'}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={handleAddSwimlane}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Swimlane
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div
                  data-testid="bottom-toolbar-panel"
                  className="ff-panel surface-ring ff-motion-in pointer-events-auto w-full px-3 py-2"
                >
                  <div className="ff-bottom-toolbar">
                    <div className="ff-bottom-toolbar-row">
                      <div className="ff-toolbar-cluster shrink-0 space-y-1">
                        <div className="ff-toolbar-cluster-label">Tool</div>
                        <div
                          className={`ff-toolbar-control-box ${
                            isDarkMode
                              ? 'border-slate-700 bg-slate-900'
                              : 'border-slate-300 bg-slate-50'
                          }`}
                        >
                          <button
                            onClick={() => setActiveTool('select')}
                            aria-pressed={activeTool === 'select'}
                            className={`ff-toolbar-btn flex items-center gap-1.5 px-2.5 text-xs font-medium ${
                              activeTool === 'select'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                            title="Select and move"
                            aria-label="Select tool"
                          >
                            <MousePointer2 className="h-4 w-4" />
                            <span>Select</span>
                          </button>
                          <button
                            onClick={() => setActiveTool('draw')}
                            aria-pressed={activeTool === 'draw'}
                            className={`ff-toolbar-btn flex items-center gap-1.5 px-2.5 text-xs font-medium ${
                              activeTool === 'draw'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                            title="Click ports to connect nodes"
                            aria-label="Connect tool"
                          >
                            <Pencil className="h-4 w-4" />
                            <span>Connect</span>
                          </button>
                          <button
                            onClick={() => setActiveTool('text')}
                            aria-pressed={activeTool === 'text'}
                            className={`ff-toolbar-btn flex items-center gap-1.5 px-2.5 text-xs font-medium ${
                              activeTool === 'text'
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                            title="Place text box"
                            aria-label="Text tool"
                          >
                            <TypeIcon className="h-4 w-4" />
                            <span>Text</span>
                          </button>
                        </div>
                      </div>

                      <div className="ff-toolbar-cluster shrink-0 space-y-1">
                        <div className="ff-toolbar-cluster-label">Insert</div>
                        <div
                          className={`ff-toolbar-control-box ${
                            isDarkMode
                              ? 'border-slate-700 bg-slate-900'
                              : 'border-slate-300 bg-slate-50'
                          }`}
                        >
                          <button
                            onClick={handleAutoConnectEdge}
                            className="ff-toolbar-btn flex items-center gap-1.5 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
                            title="Auto-connect from selected node, or nearest unlinked pair"
                            aria-label="Auto-connect edge"
                          >
                            <Sparkles className="h-4 w-4" />
                            <span>Auto Edge</span>
                          </button>
                          <DraggableConnectorButton
                            onClick={() => handleAddConnector()}
                            onNativeDragStart={handleConnectorNativeDragStart}
                          />
                        </div>
                      </div>

                      <div className="ff-toolbar-cluster min-w-0 flex-1 space-y-1">
                        <div className="ff-toolbar-cluster-label">Canvas</div>
                        <div
                          className={`ff-toolbar-control-box ${
                            isDarkMode
                              ? 'border-slate-700 bg-slate-900'
                              : 'border-slate-300 bg-slate-50'
                          }`}
                        >
                          <button
                            onClick={toggleShowPorts}
                            aria-pressed={showPorts}
                            className={`ff-toolbar-btn flex items-center gap-1.5 px-2.5 text-xs font-medium ${
                              showPorts
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                            title="Toggle ports"
                            aria-label="Toggle ports"
                          >
                            <CircleDot className="h-4 w-4" />
                            <span>Ports</span>
                          </button>
                          <button
                            onClick={toggleLayoutPanel}
                            aria-pressed={isLayoutPanelOpen}
                            className={`ff-toolbar-btn flex items-center gap-1.5 px-2.5 text-xs font-medium ${
                              isLayoutPanelOpen
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                            title="Open layout controls"
                            aria-label="Open layout controls"
                          >
                            <Rows3 className="h-4 w-4" />
                            <span>Layout</span>
                          </button>
                          <button
                            onClick={() => setSnapToGrid((prev) => !prev)}
                            aria-pressed={snapToGrid}
                            className={`ff-toolbar-btn flex items-center gap-1.5 px-2.5 text-xs font-medium ${
                              snapToGrid
                                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700'
                            }`}
                            title="Toggle snap to grid while dragging"
                            aria-label="Toggle snap to grid"
                          >
                            <span className="mono text-[10px]">{snapToGrid ? 'Snap:On' : 'Snap:Off'}</span>
                          </button>
                          <button
                            onClick={handleDelete}
                            className="ff-toolbar-btn flex items-center gap-1.5 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                            title="Delete selected"
                            aria-label="Delete selected item"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="ff-bottom-toolbar-row ff-bottom-toolbar-advanced">
                      <div className="ff-toolbar-disclosure-row">
                        <button
                          type="button"
                          data-testid="toolbar-toggle-arrange"
                          aria-label="Toggle arrange controls"
                          aria-controls="toolbar-arrange-panel"
                          aria-expanded={isArrangeControlsOpen}
                          onClick={() => setIsArrangeControlsOpen((prev) => !prev)}
                          onKeyDown={(event) => handleDisclosureToggleKeyDown(event, setIsArrangeControlsOpen)}
                          className={`ff-btn-secondary ff-focus ff-toolbar-disclosure-btn px-3 text-xs font-semibold ${
                            isArrangeControlsOpen
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                              : ''
                          }`}
                          title={isArrangeControlsOpen ? 'Hide arrange controls' : 'Show arrange controls'}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            Arrange
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${isArrangeControlsOpen ? 'rotate-180' : ''}`}
                            />
                          </span>
                        </button>
                        <button
                          type="button"
                          data-testid="toolbar-toggle-edge"
                          aria-label="Toggle edge styling controls"
                          aria-controls="toolbar-edge-panel"
                          aria-expanded={isEdgeControlsOpen}
                          onClick={() => setIsEdgeControlsOpen((prev) => !prev)}
                          onKeyDown={(event) => handleDisclosureToggleKeyDown(event, setIsEdgeControlsOpen)}
                          className={`ff-btn-secondary ff-focus ff-toolbar-disclosure-btn px-3 text-xs font-semibold ${
                            isEdgeControlsOpen
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                              : ''
                          }`}
                          title={isEdgeControlsOpen ? 'Hide edge styling controls' : 'Show edge styling controls'}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            Edge
                            <ChevronDown
                              className={`h-3.5 w-3.5 transition-transform ${isEdgeControlsOpen ? 'rotate-180' : ''}`}
                            />
                          </span>
                        </button>
                        <span className="ff-muted-text pl-1 text-[10px] font-semibold uppercase tracking-[0.1em]">
                          Advanced
                        </span>
                      </div>

                      <div
                        className={`ff-bottom-toolbar-advanced-panels ${
                          isMobileViewport ? 'w-full flex-col' : ''
                        }`}
                      >
                        {isArrangeControlsOpen && (
                          <div
                            id="toolbar-arrange-panel"
                            data-testid="toolbar-arrange-panel"
                            className="ff-toolbar-cluster ff-motion-in w-full space-y-1 md:w-auto"
                          >
                            <div className="ff-toolbar-cluster-label">Arrange</div>
                            <div
                              className={`ff-toolbar-control-box ${
                                isDarkMode
                                  ? 'border-slate-700 bg-slate-900'
                                  : 'border-slate-300 bg-slate-50'
                              }`}
                            >
                              <button
                                onClick={handleDuplicateSelection}
                                disabled={selectedNodeIds.length === 0}
                                className="ff-toolbar-btn flex items-center gap-1.5 px-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                                title="Duplicate selected nodes"
                                aria-label="Duplicate selected nodes"
                              >
                                <span>Duplicate</span>
                              </button>
                              <button
                                onClick={() => handleAlignSelectedNodes('left')}
                                disabled={selectedNodeIds.length < 2}
                                className="ff-toolbar-btn min-w-[2.5rem] px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                                title="Align left"
                                aria-label="Align selected left"
                              >
                                L
                              </button>
                              <button
                                onClick={() => handleAlignSelectedNodes('center')}
                                disabled={selectedNodeIds.length < 2}
                                className="ff-toolbar-btn min-w-[2.5rem] px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                                title="Align center"
                                aria-label="Align selected center"
                              >
                                C
                              </button>
                              <button
                                onClick={() => handleAlignSelectedNodes('right')}
                                disabled={selectedNodeIds.length < 2}
                                className="ff-toolbar-btn min-w-[2.5rem] px-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                                title="Align right"
                                aria-label="Align selected right"
                              >
                                R
                              </button>
                              <button
                                onClick={handleDistributeSelectedNodes}
                                disabled={selectedNodeIds.length < 3}
                                className="ff-toolbar-btn px-2.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                                title="Distribute horizontally"
                                aria-label="Distribute selected horizontally"
                              >
                                Dist
                              </button>
                            </div>
                          </div>
                        )}

                        {isEdgeControlsOpen && (
                          <div
                            id="toolbar-edge-panel"
                            data-testid="toolbar-edge-panel"
                            className="ff-toolbar-cluster ff-motion-in w-full space-y-1 md:w-auto"
                          >
                            <div className="ff-toolbar-cluster-label">Edge</div>
                            <div
                              className={`ff-toolbar-control-box px-2 ${
                                isDarkMode
                                  ? 'border-slate-700 bg-slate-900'
                                  : 'border-slate-300 bg-slate-50'
                              }`}
                            >
                              <span className="mr-1 hidden text-[10px] font-medium uppercase tracking-[0.1em] text-slate-500 lg:inline">
                                Link Style
                              </span>
                              {[
                                { id: 'solid', icon: <Minus className="h-4 w-4" /> },
                                { id: 'dashed', icon: <Divide className="h-4 w-4 rotate-90" /> },
                                { id: 'dotted', icon: <MoreHorizontal className="h-4 w-4" /> }
                              ].map((s) => (
                                <button
                                  key={s.id}
                                  onClick={() => {
                                    if (!hasSelectedEdge) return;
                                    setActiveEdgeStyle(s.id as 'solid' | 'dashed' | 'dotted');
                                    const edge = edges.find((e) => e.id === selectedEdgeId);
                                    if (edge) handleUpdateEdge({ ...edge, style: s.id as 'solid' | 'dashed' | 'dotted' });
                                  }}
                                  disabled={!hasSelectedEdge}
                                  aria-pressed={hasSelectedEdge && activeEdgeStyle === s.id}
                                  className={`ff-toolbar-btn h-10 w-10 p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                    hasSelectedEdge && activeEdgeStyle === s.id
                                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600'
                                  }`}
                                  title={`${s.id} line style`}
                                  aria-label={`${s.id} line style`}
                                >
                                  {s.icon}
                                </button>
                              ))}
                              <div
                                className={`mx-0.5 h-5 w-px ${
                                  isDarkMode ? 'bg-slate-600' : 'bg-slate-300'
                                }`}
                              />
                              <button
                                onClick={() => {
                                  if (!hasSelectedEdge) return;
                                  const nc = { ...activeArrowConfig, showArrowHead: !activeArrowConfig.showArrowHead };
                                  setActiveArrowConfig(nc);
                                  const edge = edges.find((e) => e.id === selectedEdgeId);
                                  if (edge) handleUpdateEdge({ ...edge, ...nc });
                                }}
                                disabled={!hasSelectedEdge}
                                aria-pressed={hasSelectedEdge && activeArrowConfig.showArrowHead}
                                className={`ff-toolbar-btn h-10 w-10 p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                  hasSelectedEdge && activeArrowConfig.showArrowHead
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600'
                                }`}
                                title="Toggle arrow head"
                                aria-label="Toggle arrow head"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (!hasSelectedEdge) return;
                                  const nc = { ...activeArrowConfig, showMidArrow: !activeArrowConfig.showMidArrow };
                                  setActiveArrowConfig(nc);
                                  const edge = edges.find((e) => e.id === selectedEdgeId);
                                  if (edge) handleUpdateEdge({ ...edge, ...nc });
                                }}
                                disabled={!hasSelectedEdge}
                                aria-pressed={hasSelectedEdge && activeArrowConfig.showMidArrow}
                                className={`ff-toolbar-btn h-10 w-10 p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                                  hasSelectedEdge && activeArrowConfig.showMidArrow
                                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-600'
                                }`}
                                title="Toggle middle arrow"
                                aria-label="Toggle middle arrow"
                              >
                                <ArrowRightLeft className="h-4 w-4" />
                              </button>
                              {!hasSelectedEdge && (
                                <span className="ml-1 hidden text-[11px] font-medium text-slate-500 dark:text-slate-400 sm:inline">
                                  Select edge
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            className={`overflow-hidden rounded-lg border transition-all duration-300 ${
              isMobileViewport
                ? `absolute inset-y-0 right-0 z-40 w-[min(92vw,340px)] transform ${
                    isInspectorOpen ? 'translate-x-0 shadow-xl' : 'translate-x-[110%]'
                  } transition-transform`
                : `${isInspectorOpen ? 'w-[340px]' : 'w-0'} relative z-30`
            } ff-panel`}
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
                canvasSettings={{
                  snapToGrid,
                  showPorts,
                  showSwimlanes,
                  gridMode
                }}
                onToggleSnapToGrid={() => setSnapToGrid((prev) => !prev)}
                onToggleShowPorts={toggleShowPorts}
                onToggleShowSwimlanes={handleToggleSwimlanes}
                onSetGridMode={(mode) => setGridMode(mode)}
                onClose={() => setIsInspectorOpen(false)}
              />
            )}
          </div>
        </main>
      </div>
  );
};

export default App;
