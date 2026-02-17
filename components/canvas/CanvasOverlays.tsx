import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  onRenameSwimlane: (laneId: number, nextLabel: string) => void;
  onToggleSwimlaneCollapsed: (laneId: number) => void;
  onToggleSwimlaneLocked: (laneId: number) => void;
  onToggleSwimlaneHidden: (laneId: number) => void;
  snapGuide: SnapGuide;
  overlayMode: OverlayMode;
};

const SWIMLANE_MIN_WIDTH = 2200;
const SWIMLANE_MARGIN_X = 420;
const LANE_TITLE_PLACEHOLDER = 'Name this lane';

const iconBaseClass = 'h-[13px] w-[13px] shrink-0';

const LaneChevronIcon: React.FC<{ collapsed: boolean }> = ({ collapsed }) => (
  <svg viewBox="0 0 16 16" className={iconBaseClass} aria-hidden="true">
    <path
      d={collapsed ? 'M5 3.5L11 8L5 12.5' : 'M3.5 6L8 10.5L12.5 6'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LaneLockIcon: React.FC<{ locked: boolean }> = ({ locked }) => (
  <svg viewBox="0 0 16 16" className={iconBaseClass} aria-hidden="true">
    <rect
      x="3.5"
      y="7.2"
      width="9"
      height="6"
      rx="1.7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <path
      d={locked ? 'M5.8 7.2V5.2A2.2 2.2 0 018 3a2.2 2.2 0 012.2 2.2v2' : 'M5.6 7.2V5.4A2.4 2.4 0 0110 4'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LaneVisibilityIcon: React.FC<{ hidden: boolean }> = ({ hidden }) => (
  <svg viewBox="0 0 16 16" className={iconBaseClass} aria-hidden="true">
    <path
      d="M1.8 8c1.6-2.6 3.7-3.9 6.2-3.9s4.6 1.3 6.2 3.9c-1.6 2.6-3.7 3.9-6.2 3.9S3.4 10.6 1.8 8z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="8" cy="8" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
    {hidden ? (
      <path
        d="M3 13L13 3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    ) : null}
  </svg>
);

const LaneMoreIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" className={iconBaseClass} aria-hidden="true">
    <circle cx="4" cy="8" r="1.1" fill="currentColor" />
    <circle cx="8" cy="8" r="1.1" fill="currentColor" />
    <circle cx="12" cy="8" r="1.1" fill="currentColor" />
  </svg>
);

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
  const getLaneTop = useCallback(
    (laneId: number) => {
      let collapsedBefore = 0;
      for (const collapsedId of collapsedLaneSet) {
        if (collapsedId < laneId) collapsedBefore += 1;
      }
      return (laneId - 1) * SWIMLANE_HEIGHT - collapsedBefore * (SWIMLANE_HEIGHT - SWIMLANE_HEADER_HEIGHT);
    },
    [collapsedLaneSet]
  );
  const getLaneHeight = useCallback(
    (laneId: number) => (collapsedLaneSet.has(laneId) ? SWIMLANE_HEADER_HEIGHT : SWIMLANE_HEIGHT),
    [collapsedLaneSet]
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
  const [editingLaneId, setEditingLaneId] = useState<number | null>(null);
  const [editingLaneName, setEditingLaneName] = useState('');
  const [openActionsLaneId, setOpenActionsLaneId] = useState<number | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editingLaneId === null) return;
    const input = titleInputRef.current;
    if (!input) return;
    input.focus();
    input.select();
  }, [editingLaneId]);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (editingLaneId !== null) {
        event.preventDefault();
        setEditingLaneId(null);
        setEditingLaneName('');
        return;
      }
      if (openActionsLaneId !== null) {
        setOpenActionsLaneId(null);
      }
    };
    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [editingLaneId, openActionsLaneId]);

  const stopCanvasEvent = useCallback((event: React.SyntheticEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleLaneHeaderClick = useCallback(
    (event: React.MouseEvent<SVGElement>, laneId: number) => {
      stopCanvasEvent(event);
      setOpenActionsLaneId(null);
      if (editingLaneId === laneId) return;
      onSelectSwimlane(selectedSwimlaneId === laneId ? null : laneId);
    },
    [editingLaneId, onSelectSwimlane, selectedSwimlaneId, stopCanvasEvent]
  );

  const beginLaneEdit = useCallback(
    (laneId: number, laneLabel: string, event?: React.SyntheticEvent) => {
      if (event) {
        stopCanvasEvent(event);
      }
      setOpenActionsLaneId(null);
      setEditingLaneId(laneId);
      setEditingLaneName(laneLabel ?? '');
      onSelectSwimlane(laneId);
    },
    [onSelectSwimlane, stopCanvasEvent]
  );

  const commitLaneEdit = useCallback(() => {
    if (editingLaneId === null) return;
    onRenameSwimlane(editingLaneId, editingLaneName);
    setEditingLaneId(null);
    setEditingLaneName('');
  }, [editingLaneId, editingLaneName, onRenameSwimlane]);

  const requestInspectorLaneNameFocus = useCallback((laneId: number) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('finflow:focus-lane-name', { detail: { laneId } }));
  }, []);

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
            const y = getLaneTop(laneId);
            const laneHeight = getLaneHeight(laneId);
            const laneCount = laneNodeCounts[index] || 0;
            const isCollapsed = collapsedLaneSet.has(laneId);
            const isLocked = lockedLaneSet.has(laneId);
            const isHidden = hiddenLaneSet.has(laneId);
            const isSelected = selectedSwimlaneId === laneId;
            const laneBodyOpacity = isHidden ? 0.14 : isCollapsed ? 0.2 : 0.72;
            // Keep lane controls inside the interactive canvas column. Without this clamp,
            // the header can render beneath the left sidebar and become unclickable.
            const laneHeaderBaseX = Math.max(swimlaneSpan.x + 20, 360);
            const laneHeaderPanelWidth = 300;
            const laneActionBaseX = laneHeaderBaseX + laneHeaderPanelWidth - 104;
            const laneMenuY = y > 120 ? y - 108 : y + SWIMLANE_HEADER_HEIGHT + 4;

            return (
              <g key={`lane-${index}`}>
                <rect
                  x={swimlaneSpan.x}
                  y={y}
                  width={swimlaneSpan.width}
                  height={laneHeight}
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
                  height={laneHeight}
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
                  stroke={isDarkMode ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.12)'}
                  strokeWidth="0.8"
                  className="pointer-events-none"
                />
                <g
                  data-canvas-interactive="true"
                  data-testid={`swimlane-header-${laneId}`}
                  onMouseDown={stopCanvasEvent}
                  onClick={(event) => handleLaneHeaderClick(event, laneId)}
                >
                  <rect
                    x={swimlaneSpan.x}
                    y={y}
                    width={swimlaneSpan.width}
                    height={SWIMLANE_HEADER_HEIGHT}
                    fill="transparent"
                  />
                </g>

                <foreignObject
                  x={laneHeaderBaseX}
                  y={y + 3}
                  width={laneHeaderPanelWidth}
                  height={SWIMLANE_HEADER_HEIGHT - 6}
                >
                  <div xmlns="http://www.w3.org/1999/xhtml" className="ff-lane-header-ui">
                    <div className="ff-lane-header-left">
                      {editingLaneId === laneId ? (
                        <input
                          ref={titleInputRef}
                          data-testid={`swimlane-title-input-${laneId}`}
                          value={editingLaneName}
                          onMouseDown={stopCanvasEvent}
                          onClick={stopCanvasEvent}
                          onChange={(event) => setEditingLaneName(event.target.value)}
                          onBlur={() => commitLaneEdit()}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              commitLaneEdit();
                              return;
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              setEditingLaneId(null);
                              setEditingLaneName('');
                            }
                          }}
                          className="ff-lane-title-input"
                          placeholder={LANE_TITLE_PLACEHOLDER}
                        />
                      ) : (
                        <button
                          type="button"
                          data-testid={`swimlane-title-trigger-${laneId}`}
                          className="ff-lane-title-button"
                          title="Edit lane name"
                          onMouseDown={stopCanvasEvent}
                          onClick={(event) => beginLaneEdit(laneId, laneLabel || '', event)}
                        >
                          {(laneLabel?.trim() || LANE_TITLE_PLACEHOLDER).slice(0, 36)}
                        </button>
                      )}
                    </div>

                    <div className="ff-lane-header-right">
                      <span className="ff-lane-count-text">
                        {laneCount} {laneCount === 1 ? 'node' : 'nodes'}
                      </span>
                      <button
                        type="button"
                        data-testid={`swimlane-toggle-collapse-${laneId}`}
                        className={`ff-lane-icon-button ${isCollapsed ? 'is-active' : ''}`}
                        title="Lane options"
                        aria-label={isCollapsed ? 'Expand lane' : 'Collapse lane'}
                        onMouseDown={stopCanvasEvent}
                        onClick={(event) => {
                          stopCanvasEvent(event);
                          onToggleSwimlaneCollapsed(laneId);
                        }}
                      >
                        <LaneChevronIcon collapsed={isCollapsed} />
                      </button>
                      <button
                        type="button"
                        data-testid={`swimlane-more-trigger-${laneId}`}
                        className={`ff-lane-icon-button ${openActionsLaneId === laneId ? 'is-active' : ''}`}
                        title="More actions"
                        aria-label="More actions"
                        aria-expanded={openActionsLaneId === laneId}
                        onMouseDown={stopCanvasEvent}
                        onClick={(event) => {
                          stopCanvasEvent(event);
                          setOpenActionsLaneId((prev) => (prev === laneId ? null : laneId));
                        }}
                      >
                        <LaneMoreIcon />
                      </button>
                    </div>
                  </div>
                </foreignObject>

                {openActionsLaneId === laneId ? (
                  <foreignObject x={laneActionBaseX - 62} y={laneMenuY} width={180} height={108}>
                    <div xmlns="http://www.w3.org/1999/xhtml" className="ff-lane-menu-card">
                      <button
                        type="button"
                        data-testid={`swimlane-toggle-lock-${laneId}`}
                        className={`ff-lane-menu-item ${isLocked ? 'is-active' : ''}`}
                        title={isLocked ? 'Unlock lane' : 'Lock lane'}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          stopCanvasEvent(event);
                          onToggleSwimlaneLocked(laneId);
                          setOpenActionsLaneId(null);
                        }}
                      >
                        <LaneLockIcon locked={isLocked} />
                        <span>{isLocked ? 'Unlock lane' : 'Lock lane'}</span>
                      </button>

                      <button
                        type="button"
                        data-testid={`swimlane-toggle-hidden-${laneId}`}
                        className={`ff-lane-menu-item ${isHidden ? 'is-active' : ''}`}
                        title={isHidden ? 'Show lane' : 'Hide lane'}
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          stopCanvasEvent(event);
                          onToggleSwimlaneHidden(laneId);
                          setOpenActionsLaneId(null);
                        }}
                      >
                        <LaneVisibilityIcon hidden={isHidden} />
                        <span>{isHidden ? 'Show lane' : 'Hide lane'}</span>
                      </button>

                      <button
                        type="button"
                        className="ff-lane-menu-item"
                        title="Rename lane"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          stopCanvasEvent(event);
                          setOpenActionsLaneId(null);
                          onSelectSwimlane(laneId);
                          requestInspectorLaneNameFocus(laneId);
                        }}
                      >
                        <svg viewBox="0 0 16 16" className={iconBaseClass} aria-hidden="true">
                          <path
                            d="M3 11.7V13h1.3l6.6-6.6-1.3-1.3L3 11.7zM11.5 4.5l1.1-1.1a1 1 0 00-1.4-1.4l-1.1 1.1 1.4 1.4z"
                            fill="currentColor"
                          />
                        </svg>
                        <span>Rename lane</span>
                      </button>
                    </div>
                  </foreignObject>
                ) : null}
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
