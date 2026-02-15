import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DrawingPath,
  Edge,
  EntityType,
  Node,
  NodePinnedAttribute,
  OverlayMode,
  Position,
  ToolMode,
  ViewportTransform
} from '../types';
import DiagramNodeCard from './canvas/DiagramNodeCard';
import DiagramEdgePath from './canvas/DiagramEdgePath';
import CanvasOverlays from './canvas/CanvasOverlays';
import MiniMapPanel from './canvas/MiniMapPanel';
import NodeContextToolbar from './canvas/NodeContextToolbar';
import { GRID_SIZE, MAX_ZOOM, MIN_ZOOM } from './canvas/canvasConstants';
import {
  SWIMLANE_HEADER_HEIGHT,
  SWIMLANE_HEIGHT,
  SWIMLANE_PADDING_Y,
  getClosestPortToPoint,
  getNodeHandlePortConfig,
  getNodeDimensions,
  getPortPosition
} from './canvas/canvasGeometry';

interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  drawings: DrawingPath[];
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  onSelectNodes: (ids: string[]) => void;
  onSelectEdge: (id: string | null) => void;
  onUpdateNodePosition: (id: string, pos: Position) => void;
  onBeginNodeMove: (ids: string[]) => void;
  onConnect: (sourceId: string, targetId: string, spIdx: number, tpIdx: number) => void;
  onReconnectEdge: (
    edgeId: string,
    next: { sourceId: string; sourcePortIdx: number; targetId: string; targetPortIdx: number }
  ) => void;
  onAddNode: (type: EntityType, pos?: Position) => void;
  isDarkMode: boolean;
  showPorts: boolean;
  snapToGrid: boolean;
  activeTool: ToolMode;
  onAddDrawing: (drawing: DrawingPath) => void;
  onOpenInspector: () => void;
  viewport: ViewportTransform;
  onViewportChange: (viewport: ViewportTransform) => void;
  onPointerWorldChange?: (position: Position | null) => void;
  isMobileViewport: boolean;
  onDeleteSelection: () => void;
  onDuplicateSelection: () => void;
  onRenameSelection: () => void;
  onActivateConnectTool: () => void;
  onToggleQuickAttribute: () => void;
  isQuickAttributePinned: boolean;
  showSwimlanes: boolean;
  swimlaneLabels: string[];
  swimlaneCollapsedIds: number[];
  swimlaneLockedIds: number[];
  swimlaneHiddenIds: number[];
  selectedSwimlaneId: number | null;
  onSelectSwimlane: (laneId: number | null) => void;
  onRenameSwimlane: (laneId: number) => void;
  onToggleSwimlaneCollapsed: (laneId: number) => void;
  onToggleSwimlaneLocked: (laneId: number) => void;
  onToggleSwimlaneHidden: (laneId: number) => void;
  gridMode: 'none' | 'lines' | 'dots';
  overlayMode: OverlayMode;
  showMinimap: boolean;
  exportLayerRef?: React.RefObject<HTMLDivElement | null>;
  pinnedNodeAttributes: NodePinnedAttribute[];
}

const AUTOSCROLL_EDGE_THRESHOLD = 40;
const AUTOSCROLL_MAX_SPEED = 16;

type LodState = {
  compactNodes: boolean;
  showNodeMeta: boolean;
  showNodeFooter: boolean;
  showEdgeLabels: boolean;
};

type ContextMenuState =
  | {
      kind: 'canvas';
      left: number;
      top: number;
      world: Position;
    }
  | {
      kind: 'node';
      left: number;
      top: number;
      world: Position;
      nodeId: string;
    };

type PendingConnection = { nodeId: string; portIdx: number };
type PendingConnectionResolution = {
  nextPending: PendingConnection | null;
  edgeToCreate?: { sourceId: string; targetId: string; sourcePortIdx: number; targetPortIdx: number };
};
type PortRole = 'source' | 'target' | 'both';
type ConnectSessionState = 'idle' | 'armed' | 'dragging' | 'chain';
type ReconnectEndpoint = 'source' | 'target';
type ReconnectSession = {
  edgeId: string;
  endpoint: ReconnectEndpoint;
  anchorNodeId: string;
  anchorPortIdx: number;
};

const parsePortHandleRef = (value: string): { nodeId: string; portIdx: number } | null => {
  const match = /^node-port-(.+)-([0-9]+)$/.exec(value);
  if (!match) return null;
  const portIdx = Number.parseInt(match[2], 10);
  if (!Number.isFinite(portIdx)) return null;
  return {
    nodeId: match[1],
    portIdx
  };
};

const isEditableTarget = (target: EventTarget | null): target is HTMLElement => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
};

const isInteractiveCanvasTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    '[data-canvas-interactive="true"], [data-node-id], [data-edge-id], button, input, textarea, select, a, summary'
  );
};

const resolvePendingConnectionFromNodeClick = (
  nodes: Node[],
  pendingConnection: PendingConnection | null,
  nodeId: string,
  clickWorld: Position
): PendingConnectionResolution => {
  const clickedNode = nodes.find((candidate) => candidate.id === nodeId);
  if (!clickedNode) return { nextPending: null };

  if (!pendingConnection) {
    const { sourcePorts } = getNodeHandlePortConfig(clickedNode);
    return {
      nextPending: {
        nodeId,
        portIdx: getClosestPortToPoint(clickedNode, clickWorld, sourcePorts)
      }
    };
  }

  if (pendingConnection.nodeId === nodeId) {
    return { nextPending: null };
  }

  const sourceNode = nodes.find((candidate) => candidate.id === pendingConnection.nodeId);
  if (!sourceNode) {
    return { nextPending: null };
  }

  const sourcePortIdx = pendingConnection.portIdx;
  const sourcePortPosition = getPortPosition(sourceNode, sourcePortIdx);
  const { targetPorts } = getNodeHandlePortConfig(clickedNode);
  const targetPortIdx = getClosestPortToPoint(clickedNode, sourcePortPosition, targetPorts);

  return {
    nextPending: null,
    edgeToCreate: {
      sourceId: sourceNode.id,
      targetId: clickedNode.id,
      sourcePortIdx,
      targetPortIdx
    }
  };
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const FlowCanvas: React.FC<FlowCanvasProps> = ({
  nodes,
  edges,
  drawings,
  selectedNodeIds,
  selectedEdgeId,
  onSelectNodes,
  onSelectEdge,
  onUpdateNodePosition,
  onBeginNodeMove,
  onConnect,
  onReconnectEdge,
  onAddNode,
  isDarkMode,
  showPorts,
  snapToGrid,
  activeTool,
  onAddDrawing,
  onOpenInspector,
  viewport,
  onViewportChange,
  onPointerWorldChange,
  isMobileViewport,
  onDeleteSelection,
  onDuplicateSelection,
  onRenameSelection,
  onActivateConnectTool,
  onToggleQuickAttribute,
  isQuickAttributePinned,
  showSwimlanes,
  swimlaneLabels,
  swimlaneCollapsedIds,
  swimlaneLockedIds,
  swimlaneHiddenIds,
  selectedSwimlaneId,
  onSelectSwimlane,
  onRenameSwimlane,
  onToggleSwimlaneCollapsed,
  onToggleSwimlaneLocked,
  onToggleSwimlaneHidden,
  gridMode,
  overlayMode,
  showMinimap,
  exportLayerRef,
  pinnedNodeAttributes
}) => {
  const [draggingNodes, setDraggingNodes] = useState<{
    ids: string[];
    pointerStart: Position;
    initialPositions: Record<string, Position>;
  } | null>(null);
  const [hasRecordedDragHistory, setHasRecordedDragHistory] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [isPortDragActive, setIsPortDragActive] = useState(false);
  const [selectionMarquee, setSelectionMarquee] = useState<{
    start: Position;
    current: Position;
    baseSelection: string[];
  } | null>(null);
  const [snapGuide, setSnapGuide] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [panningState, setPanningState] = useState<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [pointerWorld, setPointerWorld] = useState<Position | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [activeReconnect, setActiveReconnect] = useState<ReconnectSession | null>(null);
  const [hoverConnectionTarget, setHoverConnectionTarget] = useState<PendingConnection | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [lodState, setLodState] = useState<LodState>(() => ({
    compactNodes: viewport.zoom < 0.35,
    showNodeMeta: viewport.zoom >= 0.6,
    showNodeFooter: viewport.zoom >= 0.45,
    showEdgeLabels: viewport.zoom >= 0.45
  }));

  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef(viewport);
  const pendingConnectionRef = useRef<PendingConnection | null>(null);
  const isPortDragActiveRef = useRef(false);
  const activeReconnectRef = useRef<ReconnectSession | null>(null);
  const pointerMoveRafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ clientX: number; clientY: number; altKey: boolean } | null>(null);
  const lastPointerClientRef = useRef<{ x: number; y: number } | null>(null);
  const isSpacePressedRef = useRef(false);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const updatePendingConnection = useCallback((next: PendingConnection | null) => {
    pendingConnectionRef.current = next;
    setPendingConnection(next);
  }, []);

  const updatePortDragActive = useCallback((next: boolean) => {
    isPortDragActiveRef.current = next;
    setIsPortDragActive(next);
  }, []);

  const updateReconnectSession = useCallback((next: ReconnectSession | null) => {
    activeReconnectRef.current = next;
    setActiveReconnect(next);
  }, []);

  useEffect(() => {
    const zoom = viewport.zoom;
    setLodState((prev) => {
      const next: LodState = {
        compactNodes: prev.compactNodes ? zoom < 0.39 : zoom < 0.35,
        showNodeMeta: prev.showNodeMeta ? zoom >= 0.6 : zoom >= 0.64,
        showNodeFooter: prev.showNodeFooter ? zoom >= 0.45 : zoom >= 0.49,
        showEdgeLabels: prev.showEdgeLabels ? zoom >= 0.45 : zoom >= 0.49
      };

      if (
        next.compactNodes === prev.compactNodes &&
        next.showNodeMeta === prev.showNodeMeta &&
        next.showNodeFooter === prev.showNodeFooter &&
        next.showEdgeLabels === prev.showEdgeLabels
      ) {
        return prev;
      }

      return next;
    });
  }, [viewport.zoom]);

  useEffect(() => {
    if (!containerRef.current) return;

    const element = containerRef.current;
    const updateSize = () => {
      setCanvasSize({ width: element.clientWidth, height: element.clientHeight });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewportRef.current.x) / viewportRef.current.zoom,
      y: (clientY - rect.top - viewportRef.current.y) / viewportRef.current.zoom
    };
  }, []);

  const nodeById = useMemo(() => {
    const map = new Map<string, Node>();
    for (const node of nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [nodes]);

  const selectedNodeSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
  const laneCount = Math.max(1, swimlaneLabels.length);
  const collapsedLaneSet = useMemo(() => new Set(swimlaneCollapsedIds), [swimlaneCollapsedIds]);
  const hiddenLaneSet = useMemo(() => new Set(swimlaneHiddenIds), [swimlaneHiddenIds]);
  const lockedLaneSet = useMemo(() => new Set(swimlaneLockedIds), [swimlaneLockedIds]);
  const nonRenderableLaneSet = useMemo(
    () => new Set([...collapsedLaneSet, ...hiddenLaneSet]),
    [collapsedLaneSet, hiddenLaneSet]
  );

  const getNodeLaneId = useCallback(
    (node: Node) => {
      if (typeof node.swimlaneId === 'number' && Number.isFinite(node.swimlaneId)) {
        return clamp(Math.floor(node.swimlaneId), 1, laneCount);
      }
      return clamp(Math.floor(Math.max(0, node.position.y) / SWIMLANE_HEIGHT) + 1, 1, laneCount);
    },
    [laneCount]
  );

  const isNodeInteractionLocked = useCallback(
    (node: Node | null | undefined) => {
      if (!node) return false;
      return !!node.data?.isLocked || lockedLaneSet.has(getNodeLaneId(node));
    },
    [getNodeLaneId, lockedLaneSet]
  );

  const resolveDropConnectionTarget = useCallback(
    (
      clientX: number,
      clientY: number,
      source: PendingConnection,
      requiredRole: 'source' | 'target'
    ): PendingConnection | null => {
      if (typeof document === 'undefined') return null;
      const sourceNode = nodeById.get(source.nodeId);
      if (!sourceNode) return null;

      const sourcePortPosition = getPortPosition(sourceNode, source.portIdx);
      const targetElement = document.elementFromPoint(clientX, clientY);
      const resolveNodeTarget = (targetNode: Node): PendingConnection => {
        const { sourcePorts, targetPorts } = getNodeHandlePortConfig(targetNode);
        const allowedPorts = requiredRole === 'source' ? sourcePorts : targetPorts;
        const targetPortIdx = getClosestPortToPoint(targetNode, sourcePortPosition, allowedPorts);
        return {
          nodeId: targetNode.id,
          portIdx: targetPortIdx
        };
      };

      const handleElement = targetElement?.closest('[data-testid^="node-port-"]') as HTMLElement | null;
      if (handleElement) {
        const handleRef = parsePortHandleRef(
          handleElement.dataset.testid || handleElement.getAttribute('data-testid') || ''
        );
        const role = handleElement.getAttribute('data-port-role');
        const isTargetHandle =
          requiredRole === 'target' ? role === 'target' || role === 'both' : role === 'source' || role === 'both';
        if (
          handleRef &&
          isTargetHandle &&
          handleRef.nodeId !== source.nodeId &&
          !isNodeInteractionLocked(nodeById.get(handleRef.nodeId))
          ) {
          return { nodeId: handleRef.nodeId, portIdx: handleRef.portIdx };
        }
      }

      const nodeElement = targetElement?.closest('[data-node-id]') as HTMLElement | null;
      const targetNodeId = nodeElement?.getAttribute('data-node-id');
      if (targetNodeId && targetNodeId !== source.nodeId) {
        const targetNode = nodeById.get(targetNodeId);
        if (targetNode && !isNodeInteractionLocked(targetNode)) {
          return resolveNodeTarget(targetNode);
        }
      }

      const worldPoint = screenToWorld(clientX, clientY);
      const worldThreshold = Math.max(14, 18 / Math.max(viewportRef.current.zoom, 0.01));
      const worldThresholdSq = worldThreshold * worldThreshold;
      let nearestNode: Node | null = null;
      let nearestDistance = Number.POSITIVE_INFINITY;

      for (const candidate of nodes) {
        if (candidate.id === source.nodeId) continue;
        if (isNodeInteractionLocked(candidate)) continue;
        const { sourcePorts, targetPorts } = getNodeHandlePortConfig(candidate);
        const allowedPorts = requiredRole === 'source' ? sourcePorts : targetPorts;
        for (const portIdx of allowedPorts) {
          const portPosition = getPortPosition(candidate, portIdx);
          const distance =
            (portPosition.x - worldPoint.x) * (portPosition.x - worldPoint.x) +
            (portPosition.y - worldPoint.y) * (portPosition.y - worldPoint.y);
          if (distance <= worldThresholdSq && distance < nearestDistance) {
            nearestDistance = distance;
            nearestNode = candidate;
          }
        }
      }

      if (nearestNode) {
        return resolveNodeTarget(nearestNode);
      }

      const fallbackPadding = Math.max(18, 24 / Math.max(viewportRef.current.zoom, 0.01));
      for (const candidate of nodes) {
        if (candidate.id === source.nodeId) continue;
        if (isNodeInteractionLocked(candidate)) continue;
        const { width, height } = getNodeDimensions(candidate);
        const inBounds =
          worldPoint.x >= candidate.position.x - fallbackPadding &&
          worldPoint.x <= candidate.position.x + width + fallbackPadding &&
          worldPoint.y >= candidate.position.y - fallbackPadding &&
          worldPoint.y <= candidate.position.y + height + fallbackPadding;
        if (inBounds) {
          return resolveNodeTarget(candidate);
        }
      }

      return null;
    },
    [isNodeInteractionLocked, nodeById, nodes, screenToWorld]
  );

  const edgeOffsetMeta = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const edge of edges) {
      const key = [edge.sourceId, edge.targetId].sort().join('-');
      const group = groups.get(key);
      if (group) {
        group.push(edge.id);
      } else {
        groups.set(key, [edge.id]);
      }
    }

    const meta = new Map<string, { offsetIndex: number; totalEdges: number }>();
    for (const group of groups.values()) {
      const totalEdges = group.length;
      group.forEach((edgeId, offsetIndex) => {
        meta.set(edgeId, { offsetIndex, totalEdges });
      });
    }

    return meta;
  }, [edges]);

  const activeConnectorHandleIds = useMemo(() => {
    if (!selectedEdgeId) return [];
    const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
    if (!selectedEdge) return [];

    return [selectedEdge.sourceId, selectedEdge.targetId].filter((nodeId) => {
      const node = nodeById.get(nodeId);
      return !!node?.isConnectorHandle;
    });
  }, [selectedEdgeId, edges, nodeById]);

  const presentableNodes = useMemo(
    () =>
      nodes.filter((node) => {
        if (node.isConnectorHandle && !activeConnectorHandleIds.includes(node.id)) {
          return false;
        }
        const laneId = getNodeLaneId(node);
        if (showSwimlanes && nonRenderableLaneSet.has(laneId)) {
          return false;
        }
        return true;
      }),
    [activeConnectorHandleIds, getNodeLaneId, nodes, nonRenderableLaneSet, showSwimlanes]
  );

  const worldViewportBounds = useMemo(() => {
    const width = canvasSize.width || 1;
    const height = canvasSize.height || 1;
    const zoom = viewport.zoom || 1;
    const padding = 220;

    const left = -viewport.x / zoom;
    const top = -viewport.y / zoom;
    const right = left + width / zoom;
    const bottom = top + height / zoom;

    return {
      minX: left - padding,
      minY: top - padding,
      maxX: right + padding,
      maxY: bottom + padding
    };
  }, [canvasSize.height, canvasSize.width, viewport.x, viewport.y, viewport.zoom]);

  const visibleNodeIds = useMemo(() => {
    const visibleIds = new Set<string>();

    for (const node of presentableNodes) {
      const { width, height } = getNodeDimensions(node);
      const intersects = !(
        node.position.x + width < worldViewportBounds.minX ||
        node.position.x > worldViewportBounds.maxX ||
        node.position.y + height < worldViewportBounds.minY ||
        node.position.y > worldViewportBounds.maxY
      );

      if (intersects || selectedNodeSet.has(node.id) || pendingConnection?.nodeId === node.id) {
        visibleIds.add(node.id);
      }
    }

    return visibleIds;
  }, [
    pendingConnection?.nodeId,
    presentableNodes,
    selectedNodeSet,
    worldViewportBounds.maxX,
    worldViewportBounds.maxY,
    worldViewportBounds.minX,
    worldViewportBounds.minY
  ]);

  const renderedNodes = useMemo(
    () => presentableNodes.filter((node) => visibleNodeIds.has(node.id)),
    [presentableNodes, visibleNodeIds]
  );

  const renderedEdges = useMemo(
    () =>
      edges.filter((edge) => {
        const sourceNode = nodeById.get(edge.sourceId);
        const targetNode = nodeById.get(edge.targetId);
        if (
          showSwimlanes &&
          ((sourceNode && nonRenderableLaneSet.has(getNodeLaneId(sourceNode))) ||
            (targetNode && nonRenderableLaneSet.has(getNodeLaneId(targetNode))))
        ) {
          return false;
        }
        if (selectedEdgeId === edge.id) return true;
        if (sourceNode?.isConnectorHandle || targetNode?.isConnectorHandle) {
          return true;
        }
        return visibleNodeIds.has(edge.sourceId) || visibleNodeIds.has(edge.targetId);
      }),
    [edges, getNodeLaneId, nodeById, nonRenderableLaneSet, selectedEdgeId, showSwimlanes, visibleNodeIds]
  );

  const selectedConnectedEdgeIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedNodeIds.length === 0) return ids;

    for (const edge of edges) {
      if (selectedNodeSet.has(edge.sourceId) || selectedNodeSet.has(edge.targetId)) {
        ids.add(edge.id);
      }
    }

    return ids;
  }, [edges, selectedNodeIds.length, selectedNodeSet]);

  const pendingSourceNode = useMemo(
    () => (pendingConnection ? nodeById.get(pendingConnection.nodeId) || null : null),
    [nodeById, pendingConnection]
  );
  const canConnectFromPorts = activeTool === 'draw' || activeTool === 'select';
  const connectSession: ConnectSessionState = isPortDragActive
    ? 'dragging'
    : pendingConnection
      ? activeTool === 'draw'
        ? 'chain'
        : 'armed'
      : 'idle';

  const startPanning = useCallback((clientX: number, clientY: number) => {
    setContextMenu(null);
    updateReconnectSession(null);
    updatePendingConnection(null);
    setDraggingNodes(null);
    setHasRecordedDragHistory(false);
    setSelectionMarquee(null);

    setPanningState({
      startX: clientX,
      startY: clientY,
      baseX: viewportRef.current.x,
      baseY: viewportRef.current.y
    });
  }, [updatePendingConnection, updateReconnectSession]);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const openContextMenu = useCallback(
    (next:
      | { kind: 'canvas'; clientX: number; clientY: number }
      | { kind: 'node'; clientX: number; clientY: number; nodeId: string }) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawLeft = next.clientX - rect.left;
      const rawTop = next.clientY - rect.top;
      const menuWidth = next.kind === 'node' ? 188 : 212;
      const menuHeight = next.kind === 'node' ? 168 : 196;
      const left = clamp(rawLeft, 8, Math.max(8, rect.width - menuWidth - 8));
      const top = clamp(rawTop, 8, Math.max(8, rect.height - menuHeight - 8));
      const world = screenToWorld(next.clientX, next.clientY);
      if (next.kind === 'node') {
        setContextMenu({
          kind: 'node',
          left,
          top,
          world,
          nodeId: next.nodeId
        });
        return;
      }
      setContextMenu({
        kind: 'canvas',
        left,
        top,
        world
      });
    },
    [screenToWorld]
  );

  const getDiagramBounds = useCallback(() => {
    const contentNodes = nodes.filter((node) => !node.isConnectorHandle);
    if (contentNodes.length === 0) return null;

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const node of contentNodes) {
      const { width, height } = getNodeDimensions(node);
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + width);
      maxY = Math.max(maxY, node.position.y + height);
    }

    return {
      minX,
      minY,
      maxX,
      maxY
    };
  }, [nodes]);

  const fitViewToDiagram = useCallback(() => {
    const bounds = getDiagramBounds();
    if (!bounds || !containerRef.current) return;

    const padding = 120;
    const availableWidth = Math.max(120, containerRef.current.clientWidth - 24);
    const availableHeight = Math.max(120, containerRef.current.clientHeight - 24);
    const width = Math.max(1, bounds.maxX - bounds.minX + padding * 2);
    const height = Math.max(1, bounds.maxY - bounds.minY + padding * 2);
    const zoom = clamp(Math.min(availableWidth / width, availableHeight / height), MIN_ZOOM, MAX_ZOOM);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    onViewportChange({
      zoom,
      x: containerRef.current.clientWidth / 2 - centerX * zoom,
      y: containerRef.current.clientHeight / 2 - centerY * zoom
    });
  }, [getDiagramBounds, onViewportChange]);

  const centerViewOnDiagram = useCallback(() => {
    const bounds = getDiagramBounds();
    if (!bounds || !containerRef.current) return;

    const zoom = viewportRef.current.zoom;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    onViewportChange({
      zoom,
      x: containerRef.current.clientWidth / 2 - centerX * zoom,
      y: containerRef.current.clientHeight / 2 - centerY * zoom
    });
  }, [getDiagramBounds, onViewportChange]);

  const autoScrollCanvasIfNeeded = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();

      let moveX = 0;
      let moveY = 0;

      if (clientX < rect.left + AUTOSCROLL_EDGE_THRESHOLD) {
        moveX = AUTOSCROLL_MAX_SPEED * ((rect.left + AUTOSCROLL_EDGE_THRESHOLD - clientX) / AUTOSCROLL_EDGE_THRESHOLD);
      } else if (clientX > rect.right - AUTOSCROLL_EDGE_THRESHOLD) {
        moveX = -AUTOSCROLL_MAX_SPEED * ((clientX - (rect.right - AUTOSCROLL_EDGE_THRESHOLD)) / AUTOSCROLL_EDGE_THRESHOLD);
      }

      if (clientY < rect.top + AUTOSCROLL_EDGE_THRESHOLD) {
        moveY = AUTOSCROLL_MAX_SPEED * ((rect.top + AUTOSCROLL_EDGE_THRESHOLD - clientY) / AUTOSCROLL_EDGE_THRESHOLD);
      } else if (clientY > rect.bottom - AUTOSCROLL_EDGE_THRESHOLD) {
        moveY = -AUTOSCROLL_MAX_SPEED * ((clientY - (rect.bottom - AUTOSCROLL_EDGE_THRESHOLD)) / AUTOSCROLL_EDGE_THRESHOLD);
      }

      if (moveX === 0 && moveY === 0) return;

      onViewportChange({
        ...viewportRef.current,
        x: viewportRef.current.x + moveX,
        y: viewportRef.current.y + moveY
      });
    },
    [onViewportChange]
  );

  const handleCanvasMouseDownCapture = useCallback(
    (event: React.MouseEvent) => {
      if (event.button !== 0) return;
      if (isSpacePressedRef.current || isSpacePressed) {
        event.preventDefault();
        startPanning(event.clientX, event.clientY);
        return;
      }
      if (isPortDragActiveRef.current || activeReconnectRef.current) return;
      if (event.shiftKey && activeTool === 'select') return;
      if (isInteractiveCanvasTarget(event.target)) return;
      onSelectSwimlane(null);
      onSelectNodes([]);
      onSelectEdge(null);
    },
    [activeTool, isSpacePressed, onSelectEdge, onSelectNodes, onSelectSwimlane, startPanning]
  );

  const handleCanvasMouseDown = (event: React.MouseEvent) => {
    if (isPortDragActiveRef.current || activeReconnectRef.current) {
      return;
    }

    const isMiddleMouse = event.button === 1;
    const isSpacePanGesture = event.button === 0 && (isSpacePressedRef.current || isSpacePressed);
    const isHandPanGesture = event.button === 0 && activeTool === 'hand';

    if (isMiddleMouse || isSpacePanGesture || isHandPanGesture) {
      event.preventDefault();
      startPanning(event.clientX, event.clientY);
      return;
    }

    if (event.button !== 0) return;
    closeContextMenu();

    const worldPos = screenToWorld(event.clientX, event.clientY);

    const clickedNode = presentableNodes.find((candidate) => {
      const { width, height } = getNodeDimensions(candidate);
      return (
        worldPos.x >= candidate.position.x &&
        worldPos.x <= candidate.position.x + width &&
        worldPos.y >= candidate.position.y &&
        worldPos.y <= candidate.position.y + height
      );
    });

    if (activeTool === 'text') {
      onAddNode(EntityType.TEXT_BOX, { x: worldPos.x - 90, y: worldPos.y - 30 });
      return;
    }

    if (activeTool === 'draw') {
      if (clickedNode) {
        if (isNodeInteractionLocked(clickedNode)) {
          updatePendingConnection(null);
          return;
        }
        const resolution = resolvePendingConnectionFromNodeClick(
          nodes,
          pendingConnection,
          clickedNode.id,
          worldPos
        );

        if (resolution.edgeToCreate) {
          onConnect(
            resolution.edgeToCreate.sourceId,
            resolution.edgeToCreate.targetId,
            resolution.edgeToCreate.sourcePortIdx,
            resolution.edgeToCreate.targetPortIdx
          );
        }

        updatePendingConnection(resolution.nextPending);
        return;
      }

      if (pendingConnection) {
        updateReconnectSession(null);
        updatePendingConnection(null);
      }
      return;
    }

    if (activeTool === 'select' && pendingConnection) {
      if (clickedNode) {
        if (isNodeInteractionLocked(clickedNode)) {
          updatePendingConnection(null);
          return;
        }

        const resolution = resolvePendingConnectionFromNodeClick(
          nodes,
          pendingConnection,
          clickedNode.id,
          worldPos
        );

        if (resolution.edgeToCreate) {
          onConnect(
            resolution.edgeToCreate.sourceId,
            resolution.edgeToCreate.targetId,
            resolution.edgeToCreate.sourcePortIdx,
            resolution.edgeToCreate.targetPortIdx
          );
        }

        updatePendingConnection(resolution.nextPending);
        return;
      }

      updateReconnectSession(null);
      updatePendingConnection(null);
      onSelectSwimlane(null);
      onSelectNodes([]);
      onSelectEdge(null);
      return;
    }

    if (activeTool === 'select') {
      const baseSelection = event.shiftKey ? selectedNodeIds : [];
      setSelectionMarquee({
        start: worldPos,
        current: worldPos,
        baseSelection
      });
      updateReconnectSession(null);
      updatePendingConnection(null);
      setDraggingNodes(null);
      setSnapGuide({ x: null, y: null });

      if (!event.shiftKey) {
        onSelectSwimlane(null);
        onSelectNodes([]);
        onSelectEdge(null);
      }
      return;
    }

    updateReconnectSession(null);
    updatePendingConnection(null);
    onSelectSwimlane(null);
    onSelectNodes([]);
    onSelectEdge(null);
  };

  const runNodeSelectionAction = useCallback(
    (nodeId: string, action: () => void) => {
      const isAlreadySingleSelection =
        selectedNodeIds.length === 1 && selectedNodeIds[0] === nodeId && !selectedEdgeId;
      if (isAlreadySingleSelection) {
        action();
        return;
      }
      onSelectEdge(null);
      onSelectNodes([nodeId]);
      window.requestAnimationFrame(action);
    },
    [onSelectEdge, onSelectNodes, selectedEdgeId, selectedNodeIds]
  );

  const startConnectFromNode = useCallback(
    (nodeId: string) => {
      const sourceNode = nodeById.get(nodeId);
      if (!sourceNode || isNodeInteractionLocked(sourceNode)) return;
      const { sourcePorts } = getNodeHandlePortConfig(sourceNode);
      const sourcePortIdx = sourcePorts[0] ?? 1;
      const armConnection = () => {
        updatePendingConnection({ nodeId: sourceNode.id, portIdx: sourcePortIdx });
        updatePortDragActive(false);
        updateReconnectSession(null);
      };
      if (activeTool !== 'draw') {
        onActivateConnectTool();
        window.requestAnimationFrame(armConnection);
        return;
      }
      armConnection();
    },
    [activeTool, nodeById, onActivateConnectTool, updatePendingConnection, updatePortDragActive, updateReconnectSession]
  );

  const handleCanvasContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectNodes([]);
      onSelectEdge(null);
      openContextMenu({
        kind: 'canvas',
        clientX: event.clientX,
        clientY: event.clientY
      });
    },
    [onSelectEdge, onSelectNodes, openContextMenu]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      event.preventDefault();
      event.stopPropagation();
      onSelectEdge(null);
      if (!selectedNodeSet.has(nodeId) || selectedNodeIds.length !== 1) {
        onSelectNodes([nodeId]);
      }
      onOpenInspector();
      openContextMenu({
        kind: 'node',
        nodeId,
        clientX: event.clientX,
        clientY: event.clientY
      });
    },
    [onOpenInspector, onSelectEdge, onSelectNodes, openContextMenu, selectedNodeIds, selectedNodeSet]
  );

  const processMouseMove = useCallback(
    (clientX: number, clientY: number, altKey: boolean) => {
      lastPointerClientRef.current = { x: clientX, y: clientY };
      const worldPos = screenToWorld(clientX, clientY);
      setPointerWorld(worldPos);
      onPointerWorldChange?.(worldPos);

      const pending = pendingConnectionRef.current;
      if (isPortDragActiveRef.current && pending) {
        const reconnectSession = activeReconnectRef.current;
        const requiredRole = reconnectSession?.endpoint === 'source' ? 'source' : 'target';
        const dropTarget = resolveDropConnectionTarget(clientX, clientY, pending, requiredRole);
        const nextTarget =
          dropTarget && dropTarget.nodeId !== pending.nodeId ? { nodeId: dropTarget.nodeId, portIdx: dropTarget.portIdx } : null;
        setHoverConnectionTarget((prev) =>
          prev?.nodeId === nextTarget?.nodeId && prev?.portIdx === nextTarget?.portIdx ? prev : nextTarget
        );
      } else {
        setHoverConnectionTarget((prev) => (prev ? null : prev));
      }

      if (panningState) {
        const deltaX = clientX - panningState.startX;
        const deltaY = clientY - panningState.startY;
        onViewportChange({
          ...viewportRef.current,
          x: panningState.baseX + deltaX,
          y: panningState.baseY + deltaY
        });
        return;
      }

      if (selectionMarquee) {
        const nextMarquee = {
          ...selectionMarquee,
          current: worldPos
        };
        setSelectionMarquee(nextMarquee);

        autoScrollCanvasIfNeeded(clientX, clientY);

        const minX = Math.min(nextMarquee.start.x, nextMarquee.current.x);
        const minY = Math.min(nextMarquee.start.y, nextMarquee.current.y);
        const maxX = Math.max(nextMarquee.start.x, nextMarquee.current.x);
        const maxY = Math.max(nextMarquee.start.y, nextMarquee.current.y);

        const marqueeSelected = presentableNodes
          .filter((node) => {
            const { width, height } = getNodeDimensions(node);
            const nodeMinX = node.position.x;
            const nodeMaxX = node.position.x + width;
            const nodeMinY = node.position.y;
            const nodeMaxY = node.position.y + height;
            return nodeMaxX >= minX && nodeMinX <= maxX && nodeMaxY >= minY && nodeMinY <= maxY;
          })
          .map((node) => node.id);

        onSelectNodes(Array.from(new Set([...nextMarquee.baseSelection, ...marqueeSelected])));
        return;
      }

      if (!draggingNodes) {
        setSnapGuide({ x: null, y: null });
        return;
      }

      if (!hasRecordedDragHistory) {
        onBeginNodeMove(draggingNodes.ids);
        setHasRecordedDragHistory(true);
      }

      autoScrollCanvasIfNeeded(clientX, clientY);

      const deltaX = worldPos.x - draggingNodes.pointerStart.x;
      const deltaY = worldPos.y - draggingNodes.pointerStart.y;

      let appliedDeltaX = deltaX;
      let appliedDeltaY = deltaY;

      if (snapToGrid && !altKey && draggingNodes.ids.length > 0) {
        const primaryId = draggingNodes.ids[0];
        const primaryInitial = draggingNodes.initialPositions[primaryId];
        if (primaryInitial) {
          const snappedPrimaryX = Math.round((primaryInitial.x + deltaX) / GRID_SIZE) * GRID_SIZE;
          const snappedPrimaryY = Math.round((primaryInitial.y + deltaY) / GRID_SIZE) * GRID_SIZE;
          appliedDeltaX = snappedPrimaryX - primaryInitial.x;
          appliedDeltaY = snappedPrimaryY - primaryInitial.y;
          setSnapGuide({ x: snappedPrimaryX, y: snappedPrimaryY });
        }
      } else {
        setSnapGuide({ x: null, y: null });
      }

      for (const id of draggingNodes.ids) {
        const initial = draggingNodes.initialPositions[id];
        if (!initial) continue;
        onUpdateNodePosition(id, {
          x: initial.x + appliedDeltaX,
          y: initial.y + appliedDeltaY
        });
      }
    },
    [
      autoScrollCanvasIfNeeded,
      draggingNodes,
      hasRecordedDragHistory,
      onBeginNodeMove,
      onPointerWorldChange,
      onSelectNodes,
      onUpdateNodePosition,
      onViewportChange,
      panningState,
      presentableNodes,
      resolveDropConnectionTarget,
      screenToWorld,
      selectionMarquee,
      snapToGrid
    ]
  );

  const queuePointerMove = useCallback((clientX: number, clientY: number, altKey: boolean) => {
    pendingPointerRef.current = {
      clientX,
      clientY,
      altKey
    };

    if (pointerMoveRafRef.current !== null) return;

    pointerMoveRafRef.current = window.requestAnimationFrame(() => {
      pointerMoveRafRef.current = null;
      const pending = pendingPointerRef.current;
      if (!pending) return;
      processMouseMove(pending.clientX, pending.clientY, pending.altKey);
    });
  }, [processMouseMove]);

  const handleMouseMove = (event: React.MouseEvent) => {
    queuePointerMove(event.clientX, event.clientY, event.altKey);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isPortDragActiveRef.current) return;
    queuePointerMove(event.clientX, event.clientY, event.altKey);
  };

  const handleMouseUp = (event?: { clientX: number; clientY: number }) => {
    if (event) {
      lastPointerClientRef.current = { x: event.clientX, y: event.clientY };
    }

    const pending = pendingConnectionRef.current;
    const portDragging = isPortDragActiveRef.current;
    const reconnectSession = activeReconnectRef.current;

    if (portDragging && pending) {
      const dropPoint = event
        ? { x: event.clientX, y: event.clientY }
        : lastPointerClientRef.current;
      if (dropPoint) {
        const requiredRole = reconnectSession?.endpoint === 'source' ? 'source' : 'target';
        const dropTarget = resolveDropConnectionTarget(dropPoint.x, dropPoint.y, pending, requiredRole);
        if (dropTarget && dropTarget.nodeId !== pending.nodeId) {
          if (reconnectSession) {
            if (reconnectSession.endpoint === 'target') {
              onReconnectEdge(reconnectSession.edgeId, {
                sourceId: reconnectSession.anchorNodeId,
                sourcePortIdx: reconnectSession.anchorPortIdx,
                targetId: dropTarget.nodeId,
                targetPortIdx: dropTarget.portIdx
              });
            } else {
              onReconnectEdge(reconnectSession.edgeId, {
                sourceId: dropTarget.nodeId,
                sourcePortIdx: dropTarget.portIdx,
                targetId: reconnectSession.anchorNodeId,
                targetPortIdx: reconnectSession.anchorPortIdx
              });
            }
          } else {
            onConnect(
              pending.nodeId,
              dropTarget.nodeId,
              pending.portIdx,
              dropTarget.portIdx
            );
          }
        }
      }
      updatePortDragActive(false);
      updateReconnectSession(null);
      updatePendingConnection(null);
      setHoverConnectionTarget(null);
    }

    if (pointerMoveRafRef.current !== null) {
      window.cancelAnimationFrame(pointerMoveRafRef.current);
      pointerMoveRafRef.current = null;
    }
    pendingPointerRef.current = null;

    if (draggingNodes && showSwimlanes) {
      for (const id of draggingNodes.ids) {
        const node = nodeById.get(id);
        if (!node || node.type === EntityType.ANCHOR) continue;

        const { height } = getNodeDimensions(node);
        const laneIndex = getNodeLaneId(node) - 1;
        const laneTop = laneIndex * SWIMLANE_HEIGHT + SWIMLANE_HEADER_HEIGHT + SWIMLANE_PADDING_Y;
        const laneBottom = (laneIndex + 1) * SWIMLANE_HEIGHT - height - SWIMLANE_PADDING_Y;
        const laneMax = Math.max(laneTop, laneBottom);
        const nextY = clamp(node.position.y, laneTop, laneMax);

        if (Math.abs(nextY - node.position.y) > 0.1) {
          onUpdateNodePosition(id, {
            x: node.position.x,
            y: nextY
          });
        }
      }
    }

    setDraggingNodes(null);
    setHasRecordedDragHistory(false);
    setSelectionMarquee(null);
    setSnapGuide({ x: null, y: null });
    setPanningState(null);
    setPointerWorld(null);
    setHoverConnectionTarget(null);
    onPointerWorldChange?.(null);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (!isPortDragActiveRef.current) return;
    handleMouseUp({ clientX: event.clientX, clientY: event.clientY });
  };

  const handlePortClick = useCallback(
    (nodeId: string, portIdx: number, role: PortRole) => {
      const canUseConnect = canConnectFromPorts || pendingConnection !== null;
      if (!canUseConnect) return;
      if (isNodeInteractionLocked(nodeById.get(nodeId))) return;
      const canStartConnection = role === 'source' || role === 'both';
      const canCompleteConnection = role === 'target' || role === 'both';

      if (!pendingConnection) {
        if (!canStartConnection) return;
        updatePendingConnection({ nodeId, portIdx });
        return;
      }

      if (isNodeInteractionLocked(nodeById.get(pendingConnection.nodeId))) {
        updateReconnectSession(null);
        updatePendingConnection(null);
        return;
      }

      if (pendingConnection.nodeId === nodeId) {
        if (canStartConnection) {
          updatePendingConnection({ nodeId, portIdx });
          return;
        }
        updateReconnectSession(null);
        updatePendingConnection(null);
        return;
      }

      if (canCompleteConnection) {
        onConnect(pendingConnection.nodeId, nodeId, pendingConnection.portIdx, portIdx);
        updatePortDragActive(false);
        updateReconnectSession(null);
        updatePendingConnection(null);
        return;
      }

      if (canStartConnection) {
        updatePendingConnection({ nodeId, portIdx });
      }
    },
    [
      canConnectFromPorts,
      nodeById,
      onConnect,
      pendingConnection,
      updatePendingConnection,
      updatePortDragActive,
      updateReconnectSession
    ]
  );

  const handleNodeConnectClick = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      const canUseConnect = canConnectFromPorts || pendingConnection !== null;
      if (!canUseConnect) return;
      if (isNodeInteractionLocked(nodeById.get(nodeId))) return;
      const world = screenToWorld(event.clientX, event.clientY);
      const resolution = resolvePendingConnectionFromNodeClick(nodes, pendingConnection, nodeId, world);

      if (resolution.edgeToCreate) {
        onConnect(
          resolution.edgeToCreate.sourceId,
          resolution.edgeToCreate.targetId,
          resolution.edgeToCreate.sourcePortIdx,
          resolution.edgeToCreate.targetPortIdx
        );
      }

      updatePendingConnection(resolution.nextPending);
    },
    [canConnectFromPorts, nodeById, nodes, onConnect, pendingConnection, screenToWorld, updatePendingConnection]
  );

  useEffect(() => {
    if ((activeTool === 'hand' || activeTool === 'text') && pendingConnection) {
      updateReconnectSession(null);
      updatePendingConnection(null);
    }
  }, [activeTool, pendingConnection, updatePendingConnection, updateReconnectSession]);

  useEffect(() => {
    if (!pendingConnection) {
      setHoverConnectionTarget(null);
    }
  }, [pendingConnection]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ') {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        isSpacePressedRef.current = true;
        setIsSpacePressed(true);
      }

      if (event.key === 'Escape') {
        updatePortDragActive(false);
        updateReconnectSession(null);
        setDraggingNodes(null);
        setHasRecordedDragHistory(false);
        updatePendingConnection(null);
        setSelectionMarquee(null);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ') {
        isSpacePressedRef.current = false;
        setIsSpacePressed(false);
      }
    };

    const handleWindowBlur = () => {
      isSpacePressedRef.current = false;
      setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      isSpacePressedRef.current = false;
    };
  }, [updatePendingConnection, updatePortDragActive, updateReconnectSession]);

  useEffect(() => {
    if (!contextMenu) return;

    const handleWindowMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof window.Node)) return;
      if (contextMenuRef.current?.contains(target)) return;
      setContextMenu(null);
    };

    const handleWindowResize = () => {
      setContextMenu(null);
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setContextMenu(null);
    };

    window.addEventListener('mousedown', handleWindowMouseDown);
    window.addEventListener('resize', handleWindowResize);
    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('mousedown', handleWindowMouseDown);
      window.removeEventListener('resize', handleWindowResize);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [contextMenu]);

  useEffect(() => {
    return () => {
      if (pointerMoveRafRef.current !== null) {
        window.cancelAnimationFrame(pointerMoveRafRef.current);
      }
    };
  }, []);

  const handleWheel = (event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (!containerRef.current) return;
      const factor = event.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * factor));
      const rect = containerRef.current.getBoundingClientRect();
      const world = screenToWorld(event.clientX, event.clientY);
      onViewportChange({
        zoom: newZoom,
        x: event.clientX - rect.left - world.x * newZoom,
        y: event.clientY - rect.top - world.y * newZoom
      });
      return;
    }

    if (event.deltaX !== 0 || event.deltaY !== 0) {
      event.preventDefault();
      onViewportChange({
        ...viewportRef.current,
        x: viewportRef.current.x - event.deltaX,
        y: viewportRef.current.y - event.deltaY
      });
    }
  };

  const handleEdgeSelect = useCallback(
    (id: string) => {
      onSelectEdge(id);
      onOpenInspector();
    },
    [onOpenInspector, onSelectEdge]
  );

  const handleNodeMouseDown = useCallback(
    (event: React.MouseEvent, id: string) => {
      if (event.button !== 0 || isSpacePressedRef.current || isSpacePressed) return;
      event.stopPropagation();
      closeContextMenu();
      onSelectSwimlane(null);
      const clickedNode = nodeById.get(id);
      const isLockedNode = isNodeInteractionLocked(clickedNode);

      if (activeTool === 'hand') {
        startPanning(event.clientX, event.clientY);
        return;
      }

      if (activeTool === 'draw') {
        if (isLockedNode) {
          updatePendingConnection(null);
          return;
        }
        handleNodeConnectClick(event, id);
        return;
      }

      const shouldTreatAsSelect =
        activeTool === 'select' || (activeTool === 'text' && clickedNode?.type === EntityType.TEXT_BOX);
      if (!shouldTreatAsSelect) return;

      if (event.shiftKey) {
        if (selectedNodeSet.has(id)) {
          onSelectNodes(selectedNodeIds.filter((candidate) => candidate !== id));
        } else {
          onSelectNodes([...selectedNodeIds, id]);
        }
        onSelectEdge(null);
        onOpenInspector();
        return;
      }

      const dragIds = selectedNodeSet.has(id) && selectedNodeIds.length > 0 ? selectedNodeIds : [id];
      onSelectNodes(dragIds);
      onSelectEdge(null);
      onOpenInspector();

      if (isLockedNode) {
        setDraggingNodes(null);
        return;
      }

      const movableIds = dragIds.filter((nodeId) => !isNodeInteractionLocked(nodeById.get(nodeId)));
      if (movableIds.length === 0) {
        setDraggingNodes(null);
        return;
      }

      const worldPos = screenToWorld(event.clientX, event.clientY);
      const initialPositions: Record<string, Position> = {};
      for (const nodeId of movableIds) {
        const currentNode = nodeById.get(nodeId);
        if (!currentNode) continue;
        initialPositions[nodeId] = { ...currentNode.position };
      }

      setDraggingNodes({
        ids: movableIds,
        pointerStart: worldPos,
        initialPositions
      });
      setHasRecordedDragHistory(false);
    },
    [
      activeTool,
      closeContextMenu,
      handleNodeConnectClick,
      isSpacePressed,
      isNodeInteractionLocked,
      nodeById,
      onOpenInspector,
      onSelectEdge,
      onSelectNodes,
      onSelectSwimlane,
      screenToWorld,
      startPanning,
      selectedNodeIds,
      selectedNodeSet
    ]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, id: string) => {
      event.stopPropagation();
      if (activeTool === 'draw') return;
      if (!pendingConnection) return;
      handleNodeConnectClick(event, id);
    },
    [activeTool, handleNodeConnectClick, pendingConnection]
  );

  const handleNodePortClick = useCallback(
    (event: React.MouseEvent, id: string, portIdx: number, role: PortRole) => {
      event.stopPropagation();
      handlePortClick(id, portIdx, role);
    },
    [handlePortClick]
  );

  const handleNodePortMouseDown = useCallback(
    (event: React.PointerEvent, id: string, portIdx: number, role: PortRole) => {
      event.stopPropagation();
      if (!canConnectFromPorts) return;
      if (role !== 'source' && role !== 'both') return;
      if (isNodeInteractionLocked(nodeById.get(id))) return;
      const world = screenToWorld(event.clientX, event.clientY);
      updateReconnectSession(null);
      updatePendingConnection({ nodeId: id, portIdx });
      updatePortDragActive(true);
      lastPointerClientRef.current = { x: event.clientX, y: event.clientY };
      setPointerWorld(world);
      onPointerWorldChange?.(world);
    },
    [
      canConnectFromPorts,
      isNodeInteractionLocked,
      nodeById,
      onPointerWorldChange,
      screenToWorld,
      updatePendingConnection,
      updatePortDragActive,
      updateReconnectSession
    ]
  );

  const handleEdgeReconnectPointerDown = useCallback(
    (edgeId: string, endpoint: ReconnectEndpoint, clientPoint: { x: number; y: number }) => {
      if (activeTool === 'hand') return;
      const edge = edges.find((candidate) => candidate.id === edgeId);
      if (!edge) return;
      const anchorNodeId = endpoint === 'source' ? edge.targetId : edge.sourceId;
      const anchorPortIdx = endpoint === 'source' ? edge.targetPortIdx : edge.sourcePortIdx;
      const world = screenToWorld(clientPoint.x, clientPoint.y);
      updateReconnectSession({
        edgeId,
        endpoint,
        anchorNodeId,
        anchorPortIdx
      });
      updatePendingConnection({ nodeId: anchorNodeId, portIdx: anchorPortIdx });
      updatePortDragActive(true);
      lastPointerClientRef.current = { x: clientPoint.x, y: clientPoint.y };
      setPointerWorld(world);
      onPointerWorldChange?.(world);
      onSelectEdge(edgeId);
    },
    [
      activeTool,
      edges,
      onPointerWorldChange,
      onSelectEdge,
      screenToWorld,
      updatePendingConnection,
      updatePortDragActive,
      updateReconnectSession
    ]
  );

  const selectionRect = selectionMarquee
    ? {
        left: Math.min(selectionMarquee.start.x, selectionMarquee.current.x) * viewport.zoom + viewport.x,
        top: Math.min(selectionMarquee.start.y, selectionMarquee.current.y) * viewport.zoom + viewport.y,
        width: Math.abs(selectionMarquee.current.x - selectionMarquee.start.x) * viewport.zoom,
        height: Math.abs(selectionMarquee.current.y - selectionMarquee.start.y) * viewport.zoom
      }
    : null;

  const selectedNodeForToolbar = useMemo(() => {
    if (isMobileViewport || activeTool !== 'select') return null;
    if (selectedEdgeId || selectedNodeIds.length !== 1) return null;
    const selectedNode = nodeById.get(selectedNodeIds[0]);
    if (!selectedNode || selectedNode.isConnectorHandle) return null;
    return selectedNode;
  }, [activeTool, isMobileViewport, nodeById, selectedEdgeId, selectedNodeIds]);

  const nodeToolbarAnchor = useMemo(() => {
    if (!selectedNodeForToolbar) return null;
    const { width } = getNodeDimensions(selectedNodeForToolbar);
    const rawX = (selectedNodeForToolbar.position.x + width / 2) * viewport.zoom + viewport.x;
    const rawY = selectedNodeForToolbar.position.y * viewport.zoom + viewport.y - 10;
    const minX = 86;
    const maxX = Math.max(minX, (canvasSize.width || 0) - 86);
    const clampedX = Math.max(minX, Math.min(maxX, rawX));
    const clampedY = Math.max(52, rawY);
    return { x: clampedX, y: clampedY };
  }, [canvasSize.width, selectedNodeForToolbar, viewport.x, viewport.y, viewport.zoom]);

  const handleStartConnectFromSelectedNode = useCallback(() => {
    if (!selectedNodeForToolbar) return;
    startConnectFromNode(selectedNodeForToolbar.id);
  }, [selectedNodeForToolbar, startConnectFromNode]);

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${
        panningState
          ? 'cursor-grabbing'
          : isSpacePressed || activeTool === 'hand'
            ? 'cursor-grab'
            : activeTool === 'draw'
              ? 'cursor-crosshair'
              : 'cursor-default'
      } ${
        activeTool === 'draw'
          ? isDarkMode
            ? 'ring-1 ring-accent/35'
            : 'ring-1 ring-accent/30'
          : ''
      }`}
      style={{
        background: isDarkMode
          ? 'radial-gradient(1100px circle at 14% 0%, rgba(79,70,229,0.12) 0%, transparent 56%), var(--ff-surface-canvas)'
          : 'radial-gradient(900px circle at 12% 0%, rgba(79,70,229,0.08) 0%, transparent 54%), var(--ff-surface-canvas)'
      }}
      onMouseDownCapture={handleCanvasMouseDownCapture}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleCanvasContextMenu}
      onWheel={handleWheel}
    >
      <div
        ref={exportLayerRef}
        className="absolute inset-0"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0'
        }}
      >
        <svg className="absolute left-0 top-0 h-full w-full overflow-visible">
          <CanvasOverlays
            nodes={nodes}
            edges={edges}
            isDarkMode={isDarkMode}
            gridMode={gridMode}
            showSwimlanes={showSwimlanes}
            swimlaneLabels={swimlaneLabels}
            swimlaneCollapsedIds={swimlaneCollapsedIds}
            swimlaneLockedIds={swimlaneLockedIds}
            swimlaneHiddenIds={swimlaneHiddenIds}
            selectedSwimlaneId={selectedSwimlaneId}
            onSelectSwimlane={onSelectSwimlane}
            onRenameSwimlane={onRenameSwimlane}
            onToggleSwimlaneCollapsed={onToggleSwimlaneCollapsed}
            onToggleSwimlaneLocked={onToggleSwimlaneLocked}
            onToggleSwimlaneHidden={onToggleSwimlaneHidden}
            snapGuide={snapGuide}
            overlayMode={overlayMode}
          />

          {drawings.map((drawing) => (
            <polyline
              key={drawing.id}
              points={drawing.points.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke={drawing.color}
              strokeWidth={drawing.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          ))}

          {renderedEdges.map((edge) => {
            const source = nodeById.get(edge.sourceId);
            const target = nodeById.get(edge.targetId);
            if (!source || !target) return null;
            const offsetMeta = edgeOffsetMeta.get(edge.id) || { offsetIndex: 0, totalEdges: 1 };

            return (
              <DiagramEdgePath
                key={edge.id}
                edge={edge}
                source={source}
                target={target}
                isSelected={selectedEdgeId === edge.id}
                isDimmed={selectedNodeIds.length > 0 && !selectedConnectedEdgeIds.has(edge.id)}
                isDarkMode={isDarkMode}
                showLabelAtZoom={lodState.showEdgeLabels}
                onSelect={handleEdgeSelect}
                zoom={viewport.zoom}
                onStartReconnect={handleEdgeReconnectPointerDown}
                isReconnectActive={activeReconnect?.edgeId === edge.id}
                offsetIndex={offsetMeta.offsetIndex}
                totalEdges={offsetMeta.totalEdges}
              />
            );
          })}

          {pendingConnection && pointerWorld
            ? (() => {
                const sourceNode = nodeById.get(pendingConnection.nodeId);
                if (!sourceNode) return null;

                const start = getPortPosition(sourceNode, pendingConnection.portIdx);
                const end = pointerWorld;
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const length = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / length;
                const ny = dx / length;
                const control = { x: midX + nx * 24, y: midY + ny * 24 };
                const previewPath = `M ${start.x} ${start.y} Q ${control.x} ${control.y}, ${end.x} ${end.y}`;

                return (
                  <path
                    d={previewPath}
                    fill="none"
                    stroke={isDarkMode ? '#60a5fa' : '#0d99ff'}
                    strokeWidth={2}
                    strokeDasharray="6,4"
                    className="pointer-events-none"
                  />
                );
              })()
            : null}
        </svg>

        {renderedNodes.map((node) => (
          <DiagramNodeCard
            key={node.id}
            node={node}
            compactMode={lodState.compactNodes}
            showBodyMeta={lodState.showNodeMeta}
            showFooter={lodState.showNodeFooter}
            isSelected={selectedNodeSet.has(node.id)}
            isDarkMode={isDarkMode}
            pinnedAttributes={pinnedNodeAttributes}
            showPorts={showPorts}
            isConnectMode={activeTool === 'draw'}
            canConnectFromPorts={canConnectFromPorts}
            connectState={
              pendingConnection?.nodeId === node.id
                ? 'source'
                : pendingConnection && hoverConnectionTarget?.nodeId === node.id
                  ? 'candidate'
                  : 'idle'
            }
            candidatePortIdx={hoverConnectionTarget?.nodeId === node.id ? hoverConnectionTarget.portIdx : undefined}
            isConnecting={connectSession !== 'idle'}
            onMouseDown={handleNodeMouseDown}
            onClick={handleNodeClick}
            onContextMenu={handleNodeContextMenu}
            onPortMouseDown={handleNodePortMouseDown}
            onPortClick={handleNodePortClick}
            zoom={viewport.zoom}
          />
        ))}
      </div>

      {selectionRect ? (
        <div
          className={`pointer-events-none absolute rounded-md border ${
            isDarkMode ? 'border-blue-300/80 bg-blue-500/15' : 'border-blue-600/70 bg-blue-500/10'
          }`}
          style={selectionRect}
        />
      ) : null}

      {nodeToolbarAnchor ? (
        <NodeContextToolbar
          anchor={nodeToolbarAnchor}
          onDelete={onDeleteSelection}
          onDuplicate={onDuplicateSelection}
          onRename={onRenameSelection}
          onConnect={handleStartConnectFromSelectedNode}
          onToggleQuickAttribute={onToggleQuickAttribute}
          isQuickAttributePinned={isQuickAttributePinned}
        />
      ) : null}

      {contextMenu ? (
        <div
          ref={contextMenuRef}
          data-canvas-interactive="true"
          data-testid={contextMenu.kind === 'node' ? 'node-context-menu' : 'canvas-context-menu'}
          className="menu-panel absolute z-[85] min-w-[11rem]"
          style={{ left: contextMenu.left, top: contextMenu.top }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.kind === 'node' ? (
            <>
              <button
                type="button"
                data-testid="context-menu-rename-node"
                className="menu-item"
                onClick={() => {
                  closeContextMenu();
                  runNodeSelectionAction(contextMenu.nodeId, onRenameSelection);
                }}
              >
                Rename
              </button>
              <button
                type="button"
                data-testid="context-menu-duplicate-node"
                className="menu-item"
                onClick={() => {
                  closeContextMenu();
                  runNodeSelectionAction(contextMenu.nodeId, onDuplicateSelection);
                }}
              >
                Duplicate
              </button>
              <button
                type="button"
                data-testid="context-menu-start-connect"
                className="menu-item"
                onClick={() => {
                  closeContextMenu();
                  runNodeSelectionAction(contextMenu.nodeId, () => startConnectFromNode(contextMenu.nodeId));
                }}
              >
                Start connection
              </button>
              <button
                type="button"
                data-testid="context-menu-delete-node"
                className="menu-item rounded-md text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-900/30"
                onClick={() => {
                  closeContextMenu();
                  runNodeSelectionAction(contextMenu.nodeId, onDeleteSelection);
                }}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                data-testid="context-menu-add-sponsor"
                className="menu-item"
                onClick={() => {
                  closeContextMenu();
                  onAddNode(EntityType.SPONSOR_BANK, {
                    x: contextMenu.world.x - 90,
                    y: contextMenu.world.y - 30
                  });
                }}
              >
                Add Sponsor node
              </button>
              <button
                type="button"
                data-testid="context-menu-add-text"
                className="menu-item"
                onClick={() => {
                  closeContextMenu();
                  onAddNode(EntityType.TEXT_BOX, {
                    x: contextMenu.world.x - 90,
                    y: contextMenu.world.y - 30
                  });
                }}
              >
                Add Text node
              </button>
              <div className="my-1 border-t border-slate-200/75 dark:border-slate-700/75" />
              <button
                type="button"
                data-testid="context-menu-fit-view"
                className="menu-item"
                onClick={() => {
                  closeContextMenu();
                  fitViewToDiagram();
                }}
              >
                Fit view
              </button>
              <button
                type="button"
                data-testid="context-menu-center-view"
                className="menu-item"
                onClick={() => {
                  closeContextMenu();
                  centerViewOnDiagram();
                }}
              >
                Center view
              </button>
            </>
          )}
        </div>
      ) : null}

      {showMinimap ? (
        <MiniMapPanel
          nodes={presentableNodes}
          viewport={viewport}
          canvasSize={canvasSize}
          isDarkMode={isDarkMode}
          onViewportChange={onViewportChange}
        />
      ) : null}

      {activeTool === 'draw' || connectSession !== 'idle' ? (
        <div className="ff-mode-chip" role="status" aria-live="polite" data-canvas-interactive="true">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
          <strong>{activeTool === 'draw' ? 'Connect' : 'Link'}</strong>
          {pendingConnection ? (
            <>
              <span className="truncate">
                {pendingSourceNode?.label || 'Source locked'} to target
              </span>
              <button
                type="button"
                data-testid="cancel-pending-connection"
                className="status-chip !h-6 !px-2 !text-[10px]"
                onMouseDown={(evt) => evt.stopPropagation()}
                onClick={(evt) => {
                  evt.stopPropagation();
                  updatePendingConnection(null);
                }}
                aria-label="Cancel pending connection"
                title="Cancel pending connection"
              >
                Cancel
              </button>
            </>
          ) : (
            <span className="opacity-90">
              {activeTool === 'draw'
                ? 'Drag handle or source then target · Esc'
                : 'Hover a node and drag from a handle to connect'}
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default FlowCanvas;
