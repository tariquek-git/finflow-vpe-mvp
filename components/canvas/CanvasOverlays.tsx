import React, { useMemo } from 'react';
import { Edge, EntityType, GridMode, Node, OverlayMode } from '../../types';
import { GRID_EXTENT, GRID_SIZE } from './canvasConstants';
import { SWIMLANE_HEIGHT, getNodeDimensions } from './canvasGeometry';

type SnapGuide = { x: number | null; y: number | null };

type CanvasOverlaysProps = {
  nodes: Node[];
  edges: Edge[];
  isDarkMode: boolean;
  gridMode: GridMode;
  showSwimlanes: boolean;
  swimlaneLabels: string[];
  snapGuide: SnapGuide;
  overlayMode: OverlayMode;
};

const swimlaneWidth = 5000;

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
    if (node.accountType || node.type === EntityType.LIQUIDITY_PROVIDER || node.type === EntityType.SPONSOR_BANK) {
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
  snapGuide,
  overlayMode
}) => {
  const gridPatternId = `canvas-grid-${gridMode}-${isDarkMode ? 'dark' : 'light'}`;
  const riskNodeIds = useMemo(() => getRiskNodeIds(nodes, edges), [nodes, edges]);
  const ledgerNodeIds = useMemo(() => getLedgerNodeIds(nodes), [nodes]);

  return (
    <>
      {(gridMode === 'lines' || gridMode === 'dots') ? (
        <defs>
          {gridMode === 'lines' ? (
            <pattern id={gridPatternId} width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <path
                d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                fill="none"
                stroke={isDarkMode ? '#334155' : '#d7e0ee'}
                strokeWidth="1"
                opacity="0.78"
              />
            </pattern>
          ) : null}
          {gridMode === 'dots' ? (
            <pattern id={gridPatternId} width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.15" fill={isDarkMode ? '#475569' : '#b9c6d8'} opacity="0.72" />
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
            const y = index * SWIMLANE_HEIGHT;
            return (
              <g key={`lane-${index}`} className="pointer-events-none">
                <rect
                  x={-1000}
                  y={y}
                  width={swimlaneWidth}
                  height={SWIMLANE_HEIGHT}
                  fill={
                    index % 2 === 0
                      ? isDarkMode
                        ? '#1a2638'
                        : '#eff5fd'
                      : isDarkMode
                        ? '#1f2d42'
                        : '#f6f9fe'
                  }
                  opacity={0.58}
                />
                <line
                  x1={-1000}
                  y1={y}
                  x2={swimlaneWidth}
                  y2={y}
                  stroke={isDarkMode ? '#334155' : '#d4dfef'}
                  strokeWidth="1"
                />
                <text
                  x={-960}
                  y={y + 24}
                  fontSize="12"
                  fill={isDarkMode ? '#bfcede' : '#657996'}
                  fontWeight="600"
                  letterSpacing="0.03em"
                >
                  {laneLabel?.trim() || `Swimlane ${index + 1}`}
                </text>
              </g>
            );
          })
        : null}

      {(overlayMode === 'risk' || overlayMode === 'both')
        ? nodes.map((node) => {
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
