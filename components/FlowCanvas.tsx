import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBezierPath, Position as RFPosition } from '@xyflow/react';
import {
  DrawingPath,
  Edge,
  EndPointType,
  EntityType,
  FlowDirection,
  Node,
  NodeShape,
  Position,
  ViewportTransform
} from '../types';
import { ENDPOINT_ICONS, ENTITY_ICONS, RAIL_COLORS } from '../constants';

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
  onAddNode: (type: EntityType, pos?: Position) => void;
  isDarkMode: boolean;
  showPorts: boolean;
  snapToGrid: boolean;
  activeTool: 'select' | 'draw' | 'text';
  onAddDrawing: (d: DrawingPath) => void;
  onOpenInspector: () => void;
  onEditSelection: () => void;
  onDuplicateSelection: () => void;
  onDeleteSelection: () => void;
  highlightedNodeId: string | null;
  viewport: ViewportTransform;
  onViewportChange: (v: ViewportTransform) => void;
  showSwimlanes: boolean;
  swimlaneLabels: string[];
  gridMode: 'none' | 'lines' | 'dots';
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 104;
const ANCHOR_SIZE = 16;
const SWIMLANE_HEIGHT = 300;
const SNAP_GRID_SIZE = 20;
const DOT_GRID_SIZE = 24;
const LINE_GRID_SIZE = 24;
const GRID_EXTENT = 12000;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ALIGN_THRESHOLD = 6;

const isEditableTarget = (target: EventTarget | null): target is HTMLElement => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
};

const getHandlePosition = (portIdx: number): RFPosition => {
  if (portIdx === 0) return RFPosition.Top;
  if (portIdx === 1) return RFPosition.Right;
  if (portIdx === 2) return RFPosition.Bottom;
  return RFPosition.Left;
};

const ENTITY_ACCENT_COLORS: Partial<Record<EntityType, string>> = {
  [EntityType.SPONSOR_BANK]: '#0ea5e9',
  [EntityType.ISSUING_BANK]: '#4f46e5',
  [EntityType.ACQUIRING_BANK]: '#7c3aed',
  [EntityType.CENTRAL_BANK]: '#2563eb',
  [EntityType.CORRESPONDENT_BANK]: '#0284c7',
  [EntityType.CREDIT_UNION]: '#059669',
  [EntityType.PROGRAM_MANAGER]: '#f59e0b',
  [EntityType.PROCESSOR]: '#6366f1',
  [EntityType.GATEWAY]: '#8b5cf6',
  [EntityType.NETWORK]: '#2563eb',
  [EntityType.SWITCH]: '#ea580c',
  [EntityType.WALLET_PROVIDER]: '#9333ea',
  [EntityType.GATE]: '#ef4444',
  [EntityType.LIQUIDITY_PROVIDER]: '#0ea5e9',
  [EntityType.END_POINT]: '#14b8a6'
};

const isSmartEntityNode = (node: Node) => node.type !== EntityType.ANCHOR && node.type !== EntityType.TEXT_BOX;

const getNodeAccentColor = (node: Node, isDarkMode: boolean) => {
  if (node.color) return node.color;
  return ENTITY_ACCENT_COLORS[node.type] || (isDarkMode ? '#818cf8' : '#4f46e5');
};

const getPortPosition = (node: Node, portIdx: number) => {
  if (node.type === EntityType.ANCHOR) {
    return { x: node.position.x + ANCHOR_SIZE / 2, y: node.position.y + ANCHOR_SIZE / 2 };
  }

  const w = isSmartEntityNode(node)
    ? (node.width || NODE_WIDTH)
    : (node.width || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : NODE_WIDTH));
  const h = isSmartEntityNode(node)
    ? (node.height || NODE_HEIGHT)
    : (node.height || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : NODE_HEIGHT));
  const x = node.position.x;
  const y = node.position.y;
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (portIdx === 0) return { x: cx, y };
  if (portIdx === 1) return { x: x + w, y: cy };
  if (portIdx === 2) return { x: cx, y: y + h };
  return { x, y: cy };
};

const getNodeDimensions = (node: Node) => {
  if (node.type === EntityType.ANCHOR) {
    return { width: ANCHOR_SIZE, height: ANCHOR_SIZE };
  }
  if (isSmartEntityNode(node)) {
    return {
      width: node.width || NODE_WIDTH,
      height: node.height || NODE_HEIGHT
    };
  }
  return {
    width: node.width || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : NODE_WIDTH),
    height: node.height || (node.shape === NodeShape.CIRCLE ? 80 : node.shape === NodeShape.DIAMOND ? 100 : NODE_HEIGHT)
  };
};

const DiagramEdge = React.memo(
  ({
    edge,
    source,
    target,
    isSelected,
    isDarkMode,
    onSelect,
    offsetIndex,
    totalEdges
  }: {
    edge: Edge;
    source: Node;
    target: Node;
    isSelected: boolean;
    isDarkMode: boolean;
    onSelect: (id: string) => void;
    offsetIndex: number;
    totalEdges: number;
  }) => {
    const start = getPortPosition(source, edge.sourcePortIdx);
    const end = getPortPosition(target, edge.targetPortIdx);

    const gap = 30;
    const centerOffset = ((totalEdges - 1) * gap) / 2;
    const offsetValue = offsetIndex * gap - centerOffset;

    const sourceColor = edge.isExceptionPath ? '#ef4444' : getNodeAccentColor(source, isDarkMode);
    const targetColor = edge.isExceptionPath
      ? '#f87171'
      : (target.color || RAIL_COLORS[edge.rail] || getNodeAccentColor(target, isDarkMode));
    const strokeColor = edge.isExceptionPath ? '#ef4444' : RAIL_COLORS[edge.rail] || sourceColor;
    const gradientId = `edge-gradient-${edge.id}`;
    const isActiveFlow =
      isSelected ||
      edge.direction === FlowDirection.SETTLEMENT ||
      edge.label.toLowerCase().includes('funding');
    let strokeDash = '';
    if (edge.style === 'dashed' || edge.isExceptionPath) strokeDash = '6,4';
    if (edge.style === 'dotted') strokeDash = '2,4';

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;

    const finalOffset = edge.curvature !== undefined ? edge.curvature : offsetValue;
    const shiftedStart = { x: start.x + nx * (finalOffset / 2), y: start.y + ny * (finalOffset / 2) };
    const shiftedEnd = { x: end.x + nx * (finalOffset / 2), y: end.y + ny * (finalOffset / 2) };
    const [pathD, labelX, labelY] = getBezierPath({
      sourceX: shiftedStart.x,
      sourceY: shiftedStart.y,
      sourcePosition: getHandlePosition(edge.sourcePortIdx),
      targetX: shiftedEnd.x,
      targetY: shiftedEnd.y,
      targetPosition: getHandlePosition(edge.targetPortIdx),
      curvature: 0.28
    });
    const midPoint = { x: labelX, y: labelY };
    const endAngle = Math.atan2(shiftedEnd.y - shiftedStart.y, shiftedEnd.x - shiftedStart.x) * (180 / Math.PI);

    return (
      <g className="group cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(edge.id); }}>
        <defs>
          <linearGradient
            id={gradientId}
            x1={shiftedStart.x}
            y1={shiftedStart.y}
            x2={shiftedEnd.x}
            y2={shiftedEnd.y}
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor={sourceColor} />
            <stop offset="100%" stopColor={targetColor} />
          </linearGradient>
        </defs>
        <path d={pathD} stroke="transparent" strokeWidth="16" fill="none" />
        <path
          d={pathD}
          stroke={`url(#${gradientId})`}
          strokeWidth={isSelected ? 4 : edge.thickness || 2}
          strokeDasharray={strokeDash}
          fill="none"
          className="transition-all duration-200 ease-out"
        />
        {isActiveFlow && (
          <path
            d={pathD}
            stroke={isDarkMode ? 'rgba(255,255,255,0.8)' : 'rgba(79,70,229,0.58)'}
            strokeWidth={2}
            fill="none"
            className="ff-edge-flow pointer-events-none"
          />
        )}

        {edge.sequence !== undefined && edge.sequence > 0 && (
          <g transform={`translate(${midPoint.x}, ${midPoint.y})`}>
            <circle r="9" fill={strokeColor} />
            <text textAnchor="middle" dy="3.5" fontSize="9" fontWeight="bold" fill="white">{edge.sequence}</text>
          </g>
        )}

        {edge.direction === FlowDirection.SETTLEMENT && (
          <circle cx={midPoint.x} cy={midPoint.y} r="5" fill={strokeColor} className="animate-ping opacity-50" />
        )}

        {edge.showArrowHead && (
          <g transform={`translate(${end.x}, ${end.y}) rotate(${endAngle})`}>
            <path d="M -10 -5 L 0 0 L -10 5 Z" fill={strokeColor} />
          </g>
        )}

        {edge.showMidArrow && (
          <g transform={`translate(${midPoint.x}, ${midPoint.y}) rotate(${endAngle})`}>
            <path d="M -8 -4 L 0 0 L -8 4 Z" fill={strokeColor} />
          </g>
        )}

        <foreignObject
          x={midPoint.x - 60}
          y={midPoint.y - (finalOffset > 0 ? 55 : -15)}
          width="120"
          height="40"
          className="pointer-events-none overflow-visible"
        >
          <div className="flex flex-col items-center justify-center">
            <div className="ff-curve-label-pill whitespace-nowrap text-[8px] font-bold uppercase tracking-tight">
              {edge.label || edge.rail}
              {edge.amount && <span className="ml-1 text-emerald-500">${edge.amount}</span>}
            </div>
            {edge.timing && <div className="text-[7px] font-bold uppercase opacity-60">{edge.timing}</div>}
          </div>
        </foreignObject>
      </g>
    );
  }
);

type NodeVisualMeta = {
  accent: string;
  tags: string[];
  statusColor: string;
};

const DiagramNode = React.memo(
  ({
    node,
    meta,
    isSelected,
    isDarkMode,
    onMouseDown,
    onClick,
    onPortClick,
    showPorts,
    connectHighlight,
    isHighlighted
  }: {
    node: Node;
    meta: NodeVisualMeta;
    isSelected: boolean;
    isDarkMode: boolean;
    onMouseDown: (e: React.MouseEvent, id: string) => void;
    onClick: (e: React.MouseEvent) => void;
    onPortClick: (e: React.MouseEvent, id: string, idx: number) => void;
    showPorts: boolean;
    connectHighlight: boolean;
    isHighlighted: boolean;
  }) => {
    if (node.type === EntityType.ANCHOR) {
      return (
        <div
          className={`absolute cursor-grab rounded-full border shadow-sm transition-transform duration-150 hover:scale-125 active:cursor-grabbing ${
            isSelected
              ? 'bg-indigo-600 ring-2 ring-indigo-300'
              : node.isConnectorHandle
                ? 'border-indigo-400 bg-indigo-100 dark:bg-indigo-500/20'
                : isDarkMode
                  ? 'border-slate-500 bg-slate-600'
                  : 'border-slate-400 bg-slate-300'
          }`}
          style={{ left: node.position.x, top: node.position.y, width: ANCHOR_SIZE, height: ANCHOR_SIZE, zIndex: 100 }}
          onMouseDown={(e) => onMouseDown(e, node.id)}
        />
      );
    }

    const isSmartCard = isSmartEntityNode(node);
    const titleClass = isDarkMode ? 'text-slate-100' : 'text-slate-900';
    const showConnectionHandles = (showPorts || isSelected) && isSmartCard;

    if (!isSmartCard) {
      return (
        <div
          data-testid="canvas-node"
          data-node-id={node.id}
          data-node-label={node.label}
          data-selected={isSelected ? 'true' : 'false'}
          className={`group ff-node-layer absolute flex items-center justify-center rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
            isSelected ? 'ring-2 ring-indigo-500 shadow-lg' : ''
          } ${isHighlighted ? 'ff-drop-pop' : ''}`}
          style={{
            left: node.position.x,
            top: node.position.y,
            width: node.width || NODE_WIDTH,
            height: node.height || 64,
            backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
            borderColor: isDarkMode ? '#475569' : '#e2e8f0',
            color: isDarkMode ? '#e2e8f0' : '#0f172a',
            zIndex: isSelected ? 99 : 10
          }}
          onMouseDown={(e) => onMouseDown(e, node.id)}
          onClick={onClick}
        >
          {node.label}
        </div>
      );
    }

    return (
      <div
        data-testid="canvas-node"
        data-node-id={node.id}
        data-node-label={node.label}
        data-selected={isSelected ? 'true' : 'false'}
        className={`group ff-node-layer ff-smart-card absolute flex flex-col overflow-visible ${
          isSelected ? 'ring-2 ring-indigo-500 shadow-xl' : ''
        } ${connectHighlight ? 'ring-2 ring-indigo-300' : ''} ${isHighlighted ? 'ff-drop-pop' : ''}`}
        style={{
          left: node.position.x,
          top: node.position.y,
          width: node.width || NODE_WIDTH,
          height: node.height || NODE_HEIGHT,
          zIndex: isSelected ? 99 : 10
        }}
        onMouseDown={(e) => onMouseDown(e, node.id)}
        onClick={onClick}
      >
        <div className="pointer-events-none flex h-full w-full flex-col justify-between p-2">
          <div className="ff-smart-card-header">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg border"
              style={{
                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                backgroundColor: isDarkMode ? 'rgba(30,41,59,0.9)' : 'rgba(248,250,252,0.96)',
                color: meta.accent
              }}
            >
              <span>
                {node.type === EntityType.END_POINT && node.endPointType
                  ? ENDPOINT_ICONS[node.endPointType as EndPointType]
                  : ENTITY_ICONS[node.type]}
              </span>
            </div>
            <div className="min-w-0">
              <div
                className={`truncate text-[14px] font-semibold leading-tight tracking-tight ${titleClass}`}
                title={node.label}
              >
                {node.label}
              </div>
              <div className="truncate text-[10px] font-medium text-slate-500 dark:text-slate-400">
                {node.type}
              </div>
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {meta.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="ff-smart-card-meta">
                {tag}
              </span>
            ))}
            {meta.tags.length === 0 && <span className="ff-smart-card-meta">Ready</span>}
          </div>
          <div className="mt-2">
            <div className="ff-smart-card-status" style={{ backgroundColor: meta.statusColor }} />
          </div>
        </div>

        {showConnectionHandles &&
          [0, 1, 2, 3].map((idx) => {
            const label = idx === 0 ? 'N' : idx === 1 ? 'E' : idx === 2 ? 'S' : 'W';
            return (
              <button
                key={idx}
                data-testid={`node-handle-${label.toLowerCase()}`}
                className={`absolute z-50 h-4 w-4 rounded-full border-2 border-white bg-indigo-500 shadow-sm transition-all duration-150 hover:scale-110 dark:border-slate-900 ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={
                  idx === 0
                    ? { left: '50%', top: -8, transform: 'translateX(-50%)' }
                    : idx === 1
                      ? { right: -8, top: '50%', transform: 'translateY(-50%)' }
                      : idx === 2
                        ? { left: '50%', bottom: -8, transform: 'translateX(-50%)' }
                        : { left: -8, top: '50%', transform: 'translateY(-50%)' }
                }
                onMouseDown={(e) => { e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); onPortClick(e, node.id, idx); }}
                title={`Connection handle ${label}`}
                aria-label={`Connection handle ${label}`}
              />
            );
          })}
      </div>
    );
  }
);

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
  onAddNode,
  isDarkMode,
  showPorts,
  snapToGrid,
  activeTool,
  onAddDrawing,
  onOpenInspector,
  onEditSelection,
  onDuplicateSelection,
  onDeleteSelection,
  highlightedNodeId,
  viewport,
  onViewportChange,
  showSwimlanes,
  swimlaneLabels,
  gridMode
}) => {
  const [draggingNodes, setDraggingNodes] = useState<{
    ids: string[];
    pointerStart: Position;
    initialPositions: Record<string, Position>;
  } | null>(null);
  const [hasRecordedDragHistory, setHasRecordedDragHistory] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<{ nodeId: string; portIdx: number } | null>(null);
  const [selectionMarquee, setSelectionMarquee] = useState<{
    start: Position;
    current: Position;
    baseSelection: string[];
  } | null>(null);
  const [alignmentGuide, setAlignmentGuide] = useState<{ x: number | null; y: number | null }>({ x: null, y: null });
  const [panningState, setPanningState] = useState<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [pointerWorld, setPointerWorld] = useState<Position | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left - viewport.x) / viewport.zoom, y: (clientY - rect.top - viewport.y) / viewport.zoom };
  }, [viewport]);

  const edgeGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    edges.forEach((e) => {
      const key = [e.sourceId, e.targetId].sort().join('-');
      if (!groups[key]) groups[key] = [];
      groups[key].push(e.id);
    });
    return groups;
  }, [edges]);

  const activeConnectorHandleIds = useMemo(() => {
    if (!selectedEdgeId) return [];
    const selectedEdge = edges.find((edge) => edge.id === selectedEdgeId);
    if (!selectedEdge) return [];

    return [selectedEdge.sourceId, selectedEdge.targetId].filter((nodeId) => {
      const node = nodes.find((candidate) => candidate.id === nodeId);
      return !!node?.isConnectorHandle;
    });
  }, [selectedEdgeId, edges, nodes]);

  const visibleNodes = useMemo(
    () => nodes.filter((node) => !node.isConnectorHandle || activeConnectorHandleIds.includes(node.id)),
    [nodes, activeConnectorHandleIds]
  );

  const nodeVisualMeta = useMemo<Record<string, NodeVisualMeta>>(() => {
    const byNodeId: Record<string, NodeVisualMeta> = {};

    nodes.forEach((node) => {
      const linked = edges.filter((edge) => edge.sourceId === node.id || edge.targetId === node.id);
      const hasException = linked.some((edge) => !!edge.isExceptionPath);
      const hasLinks = linked.length > 0;
      const firstRail = linked.find((edge) => !!edge.rail)?.rail;
      const firstTiming = linked.find((edge) => !!edge.timing)?.timing;
      const tags: string[] = [];

      if (node.accountType) tags.push(node.accountType);
      if (firstTiming) {
        tags.push(`Settlement: ${firstTiming}`);
      } else if (hasLinks) {
        tags.push(`Links: ${linked.length}`);
      }
      if (firstRail) {
        tags.push(`Rail: ${firstRail}`);
      }

      byNodeId[node.id] = {
        accent: getNodeAccentColor(node, isDarkMode),
        tags,
        statusColor: hasException ? '#ef4444' : hasLinks ? '#10b981' : '#f59e0b'
      };
    });

    return byNodeId;
  }, [edges, isDarkMode, nodes]);

  const startPanning = useCallback(
    (clientX: number, clientY: number) => {
      setPendingConnection(null);
      setDraggingNodes(null);
      setHasRecordedDragHistory(false);
      setSelectionMarquee(null);
      setAlignmentGuide({ x: null, y: null });
      setPanningState({
        startX: clientX,
        startY: clientY,
        baseX: viewport.x,
        baseY: viewport.y
      });
    },
    [viewport.x, viewport.y]
  );

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    const isMiddleMouse = e.button === 1;
    const isSpacePanGesture = e.button === 0 && isSpacePressed;
    if (isMiddleMouse || isSpacePanGesture) {
      e.preventDefault();
      startPanning(e.clientX, e.clientY);
      return;
    }
    if (e.button !== 0) return;

    const worldPos = screenToWorld(e.clientX, e.clientY);

    if (activeTool === 'text') {
      onAddNode(EntityType.TEXT_BOX, { x: worldPos.x - 90, y: worldPos.y - 30 });
      return;
    }

    if (activeTool === 'draw' && pendingConnection) {
      setPendingConnection(null);
      return;
    }

    if (activeTool === 'select') {
      const baseSelection = e.shiftKey ? selectedNodeIds : [];
      setSelectionMarquee({
        start: worldPos,
        current: worldPos,
        baseSelection
      });
      setPendingConnection(null);
      setDraggingNodes(null);
      setAlignmentGuide({ x: null, y: null });
      if (!e.shiftKey) {
        onSelectNodes([]);
        onSelectEdge(null);
      }
      return;
    }

    setPendingConnection(null);
    onSelectNodes([]);
    onSelectEdge(null);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setPointerWorld(worldPos);

    if (panningState) {
      const deltaX = e.clientX - panningState.startX;
      const deltaY = e.clientY - panningState.startY;
      onViewportChange({
        ...viewport,
        x: panningState.baseX + deltaX,
        y: panningState.baseY + deltaY
      });
      return;
    }

    if (selectionMarquee) {
      setAlignmentGuide({ x: null, y: null });
      const nextMarquee = {
        ...selectionMarquee,
        current: worldPos
      };
      setSelectionMarquee(nextMarquee);

      const minX = Math.min(nextMarquee.start.x, nextMarquee.current.x);
      const minY = Math.min(nextMarquee.start.y, nextMarquee.current.y);
      const maxX = Math.max(nextMarquee.start.x, nextMarquee.current.x);
      const maxY = Math.max(nextMarquee.start.y, nextMarquee.current.y);

      const marqueeSelected = visibleNodes
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

    if (draggingNodes) {
      if (!hasRecordedDragHistory) {
        onBeginNodeMove(draggingNodes.ids);
        setHasRecordedDragHistory(true);
      }

      const deltaX = worldPos.x - draggingNodes.pointerStart.x;
      const deltaY = worldPos.y - draggingNodes.pointerStart.y;

      let appliedDeltaX = deltaX;
      let appliedDeltaY = deltaY;
      let guideX: number | null = null;
      let guideY: number | null = null;

      if (snapToGrid && !e.altKey && draggingNodes.ids.length > 0) {
        const primaryId = draggingNodes.ids[0];
        const primaryInitial = draggingNodes.initialPositions[primaryId];
        if (primaryInitial) {
          const snappedPrimaryX = Math.round((primaryInitial.x + deltaX) / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
          const snappedPrimaryY = Math.round((primaryInitial.y + deltaY) / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
          appliedDeltaX = snappedPrimaryX - primaryInitial.x;
          appliedDeltaY = snappedPrimaryY - primaryInitial.y;
          guideX = snappedPrimaryX;
          guideY = snappedPrimaryY;
        }
      }

      if (!e.altKey && draggingNodes.ids.length > 0) {
        const primaryId = draggingNodes.ids[0];
        const primaryNode = nodes.find((node) => node.id === primaryId);
        const primaryInitial = draggingNodes.initialPositions[primaryId];
        if (primaryNode && primaryInitial) {
          const { width, height } = getNodeDimensions(primaryNode);
          const projectedPrimary = {
            x: primaryInitial.x + appliedDeltaX,
            y: primaryInitial.y + appliedDeltaY
          };
          const draggedSet = new Set(draggingNodes.ids);
          const targetNodes = nodes.filter((node) => !draggedSet.has(node.id));

          const projectedXPoints = [
            projectedPrimary.x,
            projectedPrimary.x + width / 2,
            projectedPrimary.x + width
          ];
          const projectedYPoints = [
            projectedPrimary.y,
            projectedPrimary.y + height / 2,
            projectedPrimary.y + height
          ];

          let bestX: { adjustment: number; value: number; distance: number } | null = null;
          let bestY: { adjustment: number; value: number; distance: number } | null = null;

          targetNodes.forEach((targetNode) => {
            const { width: tWidth, height: tHeight } = getNodeDimensions(targetNode);
            const targetXPoints = [
              targetNode.position.x,
              targetNode.position.x + tWidth / 2,
              targetNode.position.x + tWidth
            ];
            const targetYPoints = [
              targetNode.position.y,
              targetNode.position.y + tHeight / 2,
              targetNode.position.y + tHeight
            ];

            projectedXPoints.forEach((xPoint) => {
              targetXPoints.forEach((targetX) => {
                const distance = Math.abs(targetX - xPoint);
                if (distance > ALIGN_THRESHOLD) return;
                const candidate = {
                  adjustment: targetX - xPoint,
                  value: targetX,
                  distance
                };
                if (!bestX || candidate.distance < bestX.distance) {
                  bestX = candidate;
                }
              });
            });

            projectedYPoints.forEach((yPoint) => {
              targetYPoints.forEach((targetY) => {
                const distance = Math.abs(targetY - yPoint);
                if (distance > ALIGN_THRESHOLD) return;
                const candidate = {
                  adjustment: targetY - yPoint,
                  value: targetY,
                  distance
                };
                if (!bestY || candidate.distance < bestY.distance) {
                  bestY = candidate;
                }
              });
            });
          });

          if (bestX) {
            appliedDeltaX += bestX.adjustment;
            guideX = bestX.value;
          }
          if (bestY) {
            appliedDeltaY += bestY.adjustment;
            guideY = bestY.value;
          }
        }
      }

      setAlignmentGuide({ x: guideX, y: guideY });

      draggingNodes.ids.forEach((id) => {
        const initial = draggingNodes.initialPositions[id];
        if (!initial) return;
        onUpdateNodePosition(id, {
          x: initial.x + appliedDeltaX,
          y: initial.y + appliedDeltaY
        });
      });
      return;
    }

    setAlignmentGuide({ x: null, y: null });
  };

  const handleMouseUp = () => {
    setDraggingNodes(null);
    setHasRecordedDragHistory(false);
    setSelectionMarquee(null);
    setAlignmentGuide({ x: null, y: null });
    setPanningState(null);
  };

  const handlePortClick = (nodeId: string, portIdx: number) => {
    if (activeTool !== 'draw') return;

    if (!pendingConnection) {
      setPendingConnection({ nodeId, portIdx });
      return;
    }
    if (pendingConnection.nodeId !== nodeId) {
      onConnect(pendingConnection.nodeId, nodeId, pendingConnection.portIdx, portIdx);
    }
    setPendingConnection(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ') {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
        setIsSpacePressed(true);
      }
      if (event.key === 'Escape') {
        setPendingConnection(null);
        setSelectionMarquee(null);
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space' || event.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (!containerRef.current) return;
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.zoom * factor));
      const rect = containerRef.current.getBoundingClientRect();
      const world = screenToWorld(e.clientX, e.clientY);
      onViewportChange({
        zoom: newZoom,
        x: e.clientX - rect.left - world.x * newZoom,
        y: e.clientY - rect.top - world.y * newZoom
      });
      return;
    }

    if (e.deltaX !== 0 || e.deltaY !== 0) {
      e.preventDefault();
      onViewportChange({
        ...viewport,
        x: viewport.x - e.deltaX,
        y: viewport.y - e.deltaY
      });
    }
  };

  const swimlaneWidth = 5000;
  const gridPatternId = `canvas-grid-${gridMode}-${isDarkMode ? 'dark' : 'light'}`;
  const gridPatternSize = gridMode === 'dots' ? DOT_GRID_SIZE : LINE_GRID_SIZE;
  const selectedContextNode =
    selectedNodeIds.length === 1
      ? visibleNodes.find((node) => node.id === selectedNodeIds[0]) || null
      : null;
  const showNodeContextToolbar =
    activeTool === 'select' &&
    !!selectedContextNode &&
    isSmartEntityNode(selectedContextNode);
  const selectionRect = selectionMarquee
    ? {
        left: Math.min(selectionMarquee.start.x, selectionMarquee.current.x) * viewport.zoom + viewport.x,
        top: Math.min(selectionMarquee.start.y, selectionMarquee.current.y) * viewport.zoom + viewport.y,
        width:
          Math.abs(selectionMarquee.current.x - selectionMarquee.start.x) * viewport.zoom,
        height:
          Math.abs(selectionMarquee.current.y - selectionMarquee.start.y) * viewport.zoom
      }
    : null;

  return (
    <div
      ref={containerRef}
      className={`relative h-full w-full overflow-hidden ${
        panningState ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : activeTool === 'draw' ? 'cursor-crosshair' : 'cursor-default'
      }`}
      style={{
        background: isDarkMode ? '#0b1220' : '#f8fafc'
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div
        data-testid="canvas-transform-layer"
        className="ff-canvas-transform-layer absolute inset-0"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0' }}
      >
        <svg className="absolute top-0 left-0 w-full h-full overflow-visible">
          {(gridMode === 'lines' || gridMode === 'dots') && (
            <defs>
              {gridMode === 'lines' && (
                <pattern id={gridPatternId} width={gridPatternSize} height={gridPatternSize} patternUnits="userSpaceOnUse">
                  <path
                    d={`M ${gridPatternSize} 0 L 0 0 0 ${gridPatternSize}`}
                    fill="none"
                    stroke={isDarkMode ? '#334155' : '#e2e8f0'}
                    strokeWidth="1"
                    opacity="0.85"
                  />
                </pattern>
              )}
              {gridMode === 'dots' && (
                <pattern id={gridPatternId} width={DOT_GRID_SIZE} height={DOT_GRID_SIZE} patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1" fill={isDarkMode ? 'rgba(148,163,184,0.34)' : '#e2e8f0'} opacity="0.95" />
                </pattern>
              )}
            </defs>
          )}

          {gridMode !== 'none' && (
            <rect
              x={-GRID_EXTENT / 2}
              y={-GRID_EXTENT / 2}
              width={GRID_EXTENT}
              height={GRID_EXTENT}
              fill={`url(#${gridPatternId})`}
              className="pointer-events-none"
            />
          )}

          {showSwimlanes &&
            swimlaneLabels.map((laneLabel, idx) => {
              const y = idx * SWIMLANE_HEIGHT;
              return (
                <g key={`lane-${idx}`} className="pointer-events-none">
                  <rect
                    x={-1000}
                    y={y}
                    width={swimlaneWidth}
                    height={SWIMLANE_HEIGHT}
                    fill={idx % 2 === 0 ? (isDarkMode ? '#1f2933' : '#f2f4f7') : isDarkMode ? '#252a31' : '#ebeff4'}
                    opacity={0.72}
                  />
                  <line x1={-1000} y1={y} x2={swimlaneWidth} y2={y} stroke={isDarkMode ? '#374151' : '#d0d7e2'} strokeWidth="1" />
                  <text x={-960} y={y + 24} fontSize="12" fill={isDarkMode ? '#cbd5e1' : '#667085'} fontWeight="600">
                    {laneLabel?.trim() || `Swimlane ${idx + 1}`}
                  </text>
                </g>
              );
            })}

          {(alignmentGuide.x !== null || alignmentGuide.y !== null) && (
            <g className="pointer-events-none">
              {alignmentGuide.x !== null && (
                <line
                  data-testid="alignment-guide"
                  x1={alignmentGuide.x}
                  y1={-GRID_EXTENT / 2}
                  x2={alignmentGuide.x}
                  y2={GRID_EXTENT / 2}
                  stroke={isDarkMode ? '#f87171' : '#ef4444'}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  opacity={0.9}
                />
              )}
              {alignmentGuide.y !== null && (
                <line
                  data-testid="alignment-guide"
                  x1={-GRID_EXTENT / 2}
                  y1={alignmentGuide.y}
                  x2={GRID_EXTENT / 2}
                  y2={alignmentGuide.y}
                  stroke={isDarkMode ? '#f87171' : '#ef4444'}
                  strokeWidth={1}
                  strokeDasharray="4,4"
                  opacity={0.9}
                />
              )}
            </g>
          )}

          {drawings.map((d) => (
            <polyline
              key={d.id}
              points={d.points.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={d.color}
              strokeWidth={d.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          ))}

          {edges.map((edge) => {
            const source = nodes.find((n) => n.id === edge.sourceId);
            const target = nodes.find((n) => n.id === edge.targetId);
            if (!source || !target) return null;
            const key = [edge.sourceId, edge.targetId].sort().join('-');
            return (
              <DiagramEdge
                key={edge.id}
                edge={edge}
                source={source}
                target={target}
                isSelected={selectedEdgeId === edge.id}
                isDarkMode={isDarkMode}
                onSelect={(id) => { onSelectEdge(id); onOpenInspector(); }}
                offsetIndex={edgeGroups[key].indexOf(edge.id)}
                totalEdges={edgeGroups[key].length}
              />
            );
          })}

          {activeTool === 'draw' && pendingConnection && pointerWorld && (() => {
            const sourceNode = nodes.find((node) => node.id === pendingConnection.nodeId);
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
          })()}
        </svg>

        {visibleNodes.map((node) => (
          <DiagramNode
            key={node.id}
            node={node}
            meta={
              nodeVisualMeta[node.id] || {
                accent: getNodeAccentColor(node, isDarkMode),
                tags: [],
                statusColor: '#f59e0b'
              }
            }
            isSelected={selectedNodeIds.includes(node.id)}
            isDarkMode={isDarkMode}
            showPorts={showPorts && activeTool === 'draw'}
            connectHighlight={pendingConnection?.nodeId === node.id}
            isHighlighted={highlightedNodeId === node.id}
            onMouseDown={(e, id) => {
              if (e.button !== 0 || isSpacePressed) return;
              e.stopPropagation();
              if (activeTool !== 'select') return;
              if (e.shiftKey) {
                if (selectedNodeIds.includes(id)) {
                  onSelectNodes(selectedNodeIds.filter((candidate) => candidate !== id));
                } else {
                  onSelectNodes([...selectedNodeIds, id]);
                }
                onSelectEdge(null);
                return;
              }

              const dragIds =
                selectedNodeIds.includes(id) && selectedNodeIds.length > 0
                  ? selectedNodeIds
                  : [id];

              onSelectNodes(dragIds);
              onSelectEdge(null);
              const worldPos = screenToWorld(e.clientX, e.clientY);
              const initialPositions: Record<string, Position> = {};
              dragIds.forEach((nodeId) => {
                const currentNode = nodes.find((candidate) => candidate.id === nodeId);
                if (!currentNode) return;
                initialPositions[nodeId] = { ...currentNode.position };
              });
              setDraggingNodes({
                ids: dragIds,
                pointerStart: worldPos,
                initialPositions
              });
              setHasRecordedDragHistory(false);
            }}
            onClick={(e) => { e.stopPropagation(); }}
            onPortClick={(_, id, idx) => handlePortClick(id, idx)}
          />
        ))}
        {showNodeContextToolbar &&
          selectedContextNode &&
          (() => {
            const { width } = getNodeDimensions(selectedContextNode);
            return (
              <div
                data-testid="node-context-toolbar"
                className="ff-floating-panel absolute z-[110] flex items-center gap-1.5 px-2 py-1"
                style={{
                  left: selectedContextNode.position.x + width / 2,
                  top: selectedContextNode.position.y - 10,
                  transform: 'translate(-50%, -100%)'
                }}
                onMouseDown={(event) => {
                  event.stopPropagation();
                }}
              >
                <button
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onEditSelection();
                    onOpenInspector();
                  }}
                  className="ff-btn-secondary ff-focus h-8 px-2.5 text-[11px] font-semibold"
                  aria-label="Edit selected node"
                >
                  Edit
                </button>
                <button
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDuplicateSelection();
                  }}
                  className="ff-btn-secondary ff-focus h-8 px-2.5 text-[11px] font-semibold"
                  aria-label="Duplicate selected node"
                >
                  Duplicate
                </button>
                <button
                  onMouseDown={(event) => {
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteSelection();
                  }}
                  className="ff-btn-secondary ff-focus h-8 px-2.5 text-[11px] font-semibold text-rose-600 dark:text-rose-300"
                  aria-label="Delete selected node"
                >
                  Delete
                </button>
              </div>
            );
          })()}
      </div>
      {selectionRect && (
        <div
          className={`pointer-events-none absolute rounded-md border ${
            isDarkMode
              ? 'border-blue-300/80 bg-blue-500/15'
              : 'border-blue-600/70 bg-blue-500/10'
          }`}
          style={selectionRect}
        />
      )}
    </div>
  );
};

export default FlowCanvas;
