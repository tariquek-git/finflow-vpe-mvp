import React, { useCallback, useMemo } from 'react';
import { Edge, EntityType, GridMode, Node, OverlayMode } from '../../types';
import { normalizeNodeAccountType } from '../../lib/nodeDisplay';
import { GRID_EXTENT, GRID_SIZE } from './canvasConstants';
import { SWIMLANE_HEADER_HEIGHT, SWIMLANE_HEIGHT, getNodeDimensions } from './canvasGeometry';

type SnapGuide = { x: number | null; y: number | null };

type CanvasOverlaysProps = {
  nodes: Node[];
  edges: Edge[];
  isDarkMode: boolean;
  gridMode: GridMode;
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
  snapGuide: SnapGuide;
  overlayMode: OverlayMode;
};

const SWIMLANE_MIN_WIDTH = 2200;
const SWIMLANE_MARGIN_X = 420;

const getRiskNodeIds = (nodes: Node[], edges: Edge[]) => {
  const set = new Set<string>();

  for (const node of nodes) {
    if (
      node.type === EntityType.GATE ||
      node.type === EntityType.PROCESSOR ||
      node.type === EntityType.NETWORK ||
      node.type === EntityType.SPONSOR_BANK
    ) {
      set.add(node.id);
    }
  }

  for (const edge of edges) {
    if (!edge.isExceptionPath) continue;
    set.add(edge.sourceId);
    set.add(edge.targetId);
  }

  return set;
};

const getLedgerNodeIds = (nodes: Node[]) => {
  const set = new Set<string>();

  for (const node of nodes) {
    const accountType = normalizeNodeAccountType(node.data?.accountType, node.accountType);
    if (accountType || node.type === EntityType.LIQUIDITY_PROVIDER || node.type === EntityType.SPONSOR_BANK) {
      set.add(node.id);
    }
  }

  return set;
};

const CanvasOverlays: React.FC<CanvasOverlaysProps> = ({
  nodes,
  edges,
  isDarkMode,
  gridMode,
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
  snapGuide,
  overlayMode
}) => {
  const gridPatternId = `canvas-grid-${gridMode}-${isDarkMode ? 'dark' : 'light'}`;
  const riskNodeIds = useMemo(() => getRiskNodeIds(nodes, edges), [nodes, edges]);
  const ledgerNodeIds = useMemo(() => getLedgerNodeIds(nodes), [nodes]);
  const laneCount = Math.max(1, swimlaneLabels.length);
  const collapsedLaneSet = useMemo(() => new Set(swimlaneCollapsedIds), [swimlaneCollapsedIds]);
  const lockedLaneSet = useMemo(() => new Set(swimlaneLockedIds), [swimlaneLockedIds]);
  const hiddenLaneSet = useMemo(() => new Set(swimlaneHiddenIds), [swimlaneHiddenIds]);
  const nonRenderableLaneSet = useMemo(
    () => new Set([...collapsedLaneSet, ...hiddenLaneSet]),
    [collapsedLaneSet, hiddenLaneSet]
  );
  const getNodeLaneId = useCallback(
    (node: Node) => {
      if (typeof node.swimlaneId === 'number' && Number.isFinite(node.swimlaneId)) {
        return Math.max(1, Math.min(laneCount, Math.floor(node.swimlaneId)));
      }
      return Math.max(1, Math.min(laneCount, Math.floor(Math.max(0, node.position.y) / SWIMLANE_HEIGHT) + 1));
    },
    [laneCount]
  );
  const laneNodeCounts = useMemo(() => {
    if (!showSwimlanes || swimlaneLabels.length === 0) return [];
    const counts = Array.from({ length: swimlaneLabels.length }, () => 0);
    for (const node of nodes) {
      if (node.type === EntityType.ANCHOR) continue;
      const laneIndex = getNodeLaneId(node) - 1;
      counts[laneIndex] += 1;
    }
    return counts;
  }, [getNodeLaneId, nodes, showSwimlanes, swimlaneLabels.length]);
  const swimlaneSpan = useMemo(() => {
    if (nodes.length === 0) {
      return {
        x: -SWIMLANE_MIN_WIDTH / 2,
        width: SWIMLANE_MIN_WIDTH
      };
    }

    let minX = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    for (const node of nodes) {
      if (node.type === EntityType.ANCHOR) continue;
      const { width } = getNodeDimensions(node);
      minX = Math.min(minX, node.position.x);
      maxX = Math.max(maxX, node.position.x + width);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
      return {
        x: -SWIMLANE_MIN_WIDTH / 2,
        width: SWIMLANE_MIN_WIDTH
      };
    }

    const paddedMin = minX - SWIMLANE_MARGIN_X;
    const paddedMax = maxX + SWIMLANE_MARGIN_X;
    const spanWidth = Math.max(SWIMLANE_MIN_WIDTH, paddedMax - paddedMin);
    return {
      x: paddedMin,
      width: spanWidth
    };
  }, [nodes]);

  const stopCanvasEvent = useCallback((event: React.MouseEvent<SVGElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleLaneHeaderClick = useCallback(
    (event: React.MouseEvent<SVGElement>, laneId: number) => {
      stopCanvasEvent(event);
      onSelectSwimlane(selectedSwimlaneId === laneId ? null : laneId);
    },
    [onSelectSwimlane, selectedSwimlaneId, stopCanvasEvent]
  );

  const handleLaneRename = useCallback(
    (event: React.MouseEvent<SVGElement>, laneId: number) => {
      stopCanvasEvent(event);
      onRenameSwimlane(laneId);
    },
    [onRenameSwimlane, stopCanvasEvent]
  );

  return (
    <>
      {(gridMode === 'lines' || gridMode === 'dots') ? (
        <defs>
          {gridMode === 'lines' ? (
            <pattern id={gridPatternId} width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path
                d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                fill="none"
                stroke={isDarkMode ? '#2f3f58' : '#e7edf5'}
                strokeWidth="1"
                opacity="0.72"
              />
            </pattern>
          ) : null}
          {gridMode === 'dots' ? (
            <pattern id={gridPatternId} width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.1" fill={isDarkMode ? '#3a4d69' : '#f1f3f5'} opacity="0.92" />
            </pattern>
          ) : null}
        </defs>
      ) : null}

      {gridMode !== 'none' ? (
        <rect
          x={-GRID_EXTENT / 2}
          y={-GRID_EXTENT / 2}
          width={GRID_EXTENT}
          height={GRID_EXTENT}
          fill={`url(#${gridPatternId})`}
          className="pointer-events-none"
        />
      ) : null}

      {showSwimlanes
        ? swimlaneLabels.map((laneLabel, index) => {
            const laneId = index + 1;
            const y = index * SWIMLANE_HEIGHT;
            const laneCount = laneNodeCounts[index] || 0;
            const isCollapsed = collapsedLaneSet.has(laneId);
            const isLocked = lockedLaneSet.has(laneId);
            const isHidden = hiddenLaneSet.has(laneId);
            const isSelected = selectedSwimlaneId === laneId;
            const laneBodyOpacity = isHidden ? 0.16 : isCollapsed ? 0.22 : 0.8;
            const laneHeaderBaseX = Math.max(swimlaneSpan.x + 20, 360);
            const laneActionBaseX = laneHeaderBaseX + 280;

            return (
              <g key={`lane-${index}`}>
                <rect
                  x={swimlaneSpan.x}
                  y={y}
                  width={swimlaneSpan.width}
                  height={SWIMLANE_HEIGHT}
                  fill={
                    index % 2 === 0
                      ? isDarkMode
                        ? 'rgba(37, 99, 235, 0.09)'
                        : 'rgba(37, 99, 235, 0.045)'
                      : isDarkMode
                        ? 'rgba(30, 64, 175, 0.06)'
                        : 'rgba(148, 163, 184, 0.04)'
                  }
                  opacity={laneBodyOpacity}
                  className="pointer-events-none"
                />
                <rect
                  x={swimlaneSpan.x}
                  y={y}
                  width={swimlaneSpan.width}
                  height={SWIMLANE_HEIGHT}
                  fill="none"
                  stroke={
                    isSelected
                      ? isDarkMode
                        ? 'rgba(59, 130, 246, 0.7)'
                        : 'rgba(37, 99, 235, 0.62)'
                      : isDarkMode
                        ? 'rgba(148, 163, 184, 0.26)'
                        : 'rgba(100, 116, 139, 0.22)'
                  }
                  strokeWidth={isSelected ? 1.4 : 1}
                  className="pointer-events-none"
                />
                <rect
                  x={swimlaneSpan.x}
                  y={y}
                  width={swimlaneSpan.width}
                  height={SWIMLANE_HEADER_HEIGHT}
                  rx={12}
                  fill={
                    isSelected
                      ? isDarkMode
                        ? 'rgba(30, 58, 138, 0.62)'
                        : 'rgba(219, 234, 254, 0.88)'
                      : isDarkMode
                        ? 'rgba(15, 23, 42, 0.42)'
                        : 'rgba(255, 255, 255, 0.82)'
                  }
                  stroke={
                    isSelected
                      ? isDarkMode
                        ? 'rgba(96, 165, 250, 0.8)'
                        : 'rgba(37, 99, 235, 0.55)'
                      : isDarkMode
                        ? 'rgba(148, 163, 184, 0.2)'
                        : 'rgba(148, 163, 184, 0.24)'
                  }
                  strokeWidth={isSelected ? 1.4 : 1}
                  className="pointer-events-none"
                />
                <line
                  x1={swimlaneSpan.x}
                  y1={y + SWIMLANE_HEADER_HEIGHT}
                  x2={swimlaneSpan.x + swimlaneSpan.width}
                  y2={y + SWIMLANE_HEADER_HEIGHT}
                  stroke={isDarkMode ? 'rgba(148, 163, 184, 0.24)' : 'rgba(148, 163, 184, 0.3)'}
                  strokeWidth="1"
                  className="pointer-events-none"
                />
                <rect
                  x={laneHeaderBaseX}
                  y={y + 8}
                  width={260}
                  height={22}
                  rx={11}
                  fill={isDarkMode ? 'rgba(15, 23, 42, 0.62)' : 'rgba(255, 255, 255, 0.94)'}
                  stroke={isDarkMode ? 'rgba(148, 163, 184, 0.28)' : 'rgba(148, 163, 184, 0.34)'}
                  strokeWidth="1"
                  className="pointer-events-none"
                />
                <text
                  x={laneHeaderBaseX + 14}
                  y={y + 22}
                  fontSize="11.5"
                  fill={isDarkMode ? '#d7e2f2' : '#334155'}
                  fontWeight="600"
                  letterSpacing="0.01em"
                >
                  {(laneLabel?.trim() || `Swimlane ${index + 1}`).slice(0, 28)}
                </text>
                <text
                  x={laneHeaderBaseX + 230}
                  y={y + 22}
                  fontSize="10.5"
                  fill={isDarkMode ? '#94a3b8' : '#64748b'}
                  fontWeight="600"
                  textAnchor="end"
                >
                  {laneCount} {laneCount === 1 ? 'node' : 'nodes'}
                </text>
                <text
                  x={laneHeaderBaseX + 400}
                  y={y + 22}
                  fontSize="10.5"
                  fill={isDarkMode ? '#9aa9bf' : '#7b8aa1'}
                  fontWeight="500"
                  textAnchor="start"
                >
                  {isHidden
                    ? 'Hidden lane'
                    : isCollapsed
                      ? 'Collapsed lane'
                      : laneCount === 0
                        ? 'Empty lane · drop nodes here'
                        : ''}
                </text>

                <g
                  data-canvas-interactive="true"
                  data-testid={`swimlane-header-${laneId}`}
                  onMouseDown={stopCanvasEvent}
                  onClick={(event) => handleLaneHeaderClick(event, laneId)}
                  onDoubleClick={(event) => handleLaneRename(event, laneId)}
                >
                  <rect
                    x={swimlaneSpan.x}
                    y={y}
                    width={swimlaneSpan.width}
                    height={SWIMLANE_HEADER_HEIGHT}
                    fill="transparent"
                  />
                </g>

                <g
                  data-canvas-interactive="true"
                  onMouseDown={stopCanvasEvent}
                  onClick={(event) => {
                    stopCanvasEvent(event);
                    onToggleSwimlaneCollapsed(laneId);
                  }}
                >
                  <rect
                    data-testid={`swimlane-toggle-collapse-${laneId}`}
                    x={laneActionBaseX}
                    y={y + 7}
                    width={34}
                    height={22}
                    rx={10}
                    fill={isCollapsed ? (isDarkMode ? 'rgba(56, 189, 248, 0.2)' : 'rgba(186, 230, 253, 0.9)') : isDarkMode ? 'rgba(15, 23, 42, 0.58)' : 'rgba(255, 255, 255, 0.95)'}
                    stroke={isDarkMode ? 'rgba(148, 163, 184, 0.28)' : 'rgba(148, 163, 184, 0.34)'}
                    strokeWidth="1"
                  />
                  <text
                    x={laneActionBaseX + 17}
                    y={y + 21}
                    fontSize="11"
                    fill={isDarkMode ? '#dbeafe' : '#1e3a8a'}
                    fontWeight="700"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {isCollapsed ? '+' : '-'}
                  </text>
                </g>

                <g
                  data-canvas-interactive="true"
                  onMouseDown={stopCanvasEvent}
                  onClick={(event) => {
                    stopCanvasEvent(event);
                    onToggleSwimlaneLocked(laneId);
                  }}
                >
                  <rect
                    data-testid={`swimlane-toggle-lock-${laneId}`}
                    x={laneActionBaseX + 40}
                    y={y + 7}
                    width={34}
                    height={22}
                    rx={10}
                    fill={isLocked ? (isDarkMode ? 'rgba(251, 191, 36, 0.22)' : 'rgba(254, 243, 199, 0.9)') : isDarkMode ? 'rgba(15, 23, 42, 0.58)' : 'rgba(255, 255, 255, 0.95)'}
                    stroke={isDarkMode ? 'rgba(148, 163, 184, 0.28)' : 'rgba(148, 163, 184, 0.34)'}
                    strokeWidth="1"
                  />
                  <text
                    x={laneActionBaseX + 57}
                    y={y + 21}
                    fontSize="10.5"
                    fill={isDarkMode ? '#fef3c7' : '#854d0e'}
                    fontWeight="700"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {isLocked ? 'L' : 'U'}
                  </text>
                </g>

                <g
                  data-canvas-interactive="true"
                  onMouseDown={stopCanvasEvent}
                  onClick={(event) => {
                    stopCanvasEvent(event);
                    onToggleSwimlaneHidden(laneId);
                  }}
                >
                  <rect
                    data-testid={`swimlane-toggle-hidden-${laneId}`}
                    x={laneActionBaseX + 80}
                    y={y + 7}
                    width={34}
                    height={22}
                    rx={10}
                    fill={isHidden ? (isDarkMode ? 'rgba(244, 114, 182, 0.22)' : 'rgba(251, 207, 232, 0.9)') : isDarkMode ? 'rgba(15, 23, 42, 0.58)' : 'rgba(255, 255, 255, 0.95)'}
                    stroke={isDarkMode ? 'rgba(148, 163, 184, 0.28)' : 'rgba(148, 163, 184, 0.34)'}
                    strokeWidth="1"
                  />
                  <text
                    x={laneActionBaseX + 97}
                    y={y + 21}
                    fontSize="10.5"
                    fill={isDarkMode ? '#fce7f3' : '#9d174d'}
                    fontWeight="700"
                    textAnchor="middle"
                    className="pointer-events-none"
                  >
                    {isHidden ? 'S' : 'H'}
                  </text>
                </g>
              </g>
            );
          })
        : null}

      {(overlayMode === 'risk' || overlayMode === 'both')
        ? nodes.map((node) => {
            if (showSwimlanes && nonRenderableLaneSet.has(getNodeLaneId(node))) return null;
            if (!riskNodeIds.has(node.id) || node.type === EntityType.ANCHOR) return null;
            const { width, height } = getNodeDimensions(node);
            return (
              <rect
                key={`risk-overlay-${node.id}`}
                data-testid={`risk-overlay-${node.id}`}
                x={node.position.x - 6}
                y={node.position.y - 6}
                width={width + 12}
                height={height + 12}
                rx={16}
                fill="rgba(244, 63, 94, 0.07)"
                stroke="rgba(244, 63, 94, 0.34)"
                strokeDasharray="4,4"
                strokeWidth="1"
                className="pointer-events-none"
              />
            );
          })
        : null}

      {(overlayMode === 'ledger' || overlayMode === 'both')
        ? nodes.map((node) => {
            if (showSwimlanes && nonRenderableLaneSet.has(getNodeLaneId(node))) return null;
            if (!ledgerNodeIds.has(node.id) || node.type === EntityType.ANCHOR) return null;
            const { width, height } = getNodeDimensions(node);
            return (
              <rect
                key={`ledger-overlay-${node.id}`}
                data-testid={`ledger-overlay-${node.id}`}
                x={node.position.x - 4}
                y={node.position.y - 4}
                width={width + 8}
                height={height + 8}
                rx={14}
                fill="rgba(14, 165, 233, 0.06)"
                stroke="rgba(14, 165, 233, 0.3)"
                strokeWidth="1"
                className="pointer-events-none"
              />
            );
          })
        : null}

      {(snapGuide.x !== null || snapGuide.y !== null) ? (
        <g className="pointer-events-none">
          {snapGuide.x !== null ? (
            <line
              x1={snapGuide.x}
              y1={-GRID_EXTENT / 2}
              x2={snapGuide.x}
              y2={GRID_EXTENT / 2}
              stroke={isDarkMode ? '#67e8f9' : '#0891b2'}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.82}
            />
          ) : null}
          {snapGuide.y !== null ? (
            <line
              x1={-GRID_EXTENT / 2}
              y1={snapGuide.y}
              x2={GRID_EXTENT / 2}
              y2={snapGuide.y}
              stroke={isDarkMode ? '#67e8f9' : '#0891b2'}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.82}
            />
          ) : null}
        </g>
      ) : null}
    </>
  );
};

export default CanvasOverlays;
