import React, { useMemo, useState } from 'react';
import { getBezierPath } from '@xyflow/react';
import { RAIL_COLORS } from '../../constants';
import { Edge, FlowDirection, Node } from '../../types';
import { getHandlePosition, getPortPosition } from './canvasGeometry';

type DiagramEdgePathProps = {
  edge: Edge;
  source: Node;
  target: Node;
  isSelected: boolean;
  isDimmed: boolean;
  isDarkMode: boolean;
  showLabelAtZoom: boolean;
  offsetIndex: number;
  totalEdges: number;
  zoom: number;
  onStartReconnect?: (
    edgeId: string,
    endpoint: 'source' | 'target',
    clientPoint: { x: number; y: number }
  ) => void;
  isReconnectActive?: boolean;
  onSelect: (id: string, clientPoint?: { x: number; y: number }) => void;
};

const getDirectionStage = (direction: FlowDirection) => {
  if (direction === FlowDirection.AUTH) return 'Auth';
  if (direction === FlowDirection.SETTLEMENT) return 'Settlement';
  if (direction === FlowDirection.RETURN) return 'Return';
  if (direction === FlowDirection.PULL) return 'Capture';
  return 'Transfer';
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const DiagramEdgePathComponent: React.FC<DiagramEdgePathProps> = ({
  edge,
  source,
  target,
  isSelected,
  isDimmed,
  isDarkMode,
  showLabelAtZoom,
  offsetIndex,
  totalEdges,
  zoom,
  onStartReconnect,
  isReconnectActive = false,
  onSelect
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const start = getPortPosition(source, edge.sourcePortIdx);
  const end = getPortPosition(target, edge.targetPortIdx);
  const railColor = edge.isExceptionPath ? '#ef4444' : RAIL_COLORS[edge.rail] || (isDarkMode ? '#818cf8' : '#4f46e5');
  // Quiet-by-default: keep unselected edges subdued so nodes remain the hero.
  const neutralColor = isDarkMode ? '#6b7a92' : '#8fa1b6';

  let strokeDash = '';
  if (edge.style === 'dashed' || edge.isExceptionPath) strokeDash = '6,4';
  if (edge.style === 'dotted') strokeDash = '2,4';

  const pathMeta = useMemo(() => {
    const gap = 26;
    const centerOffset = ((totalEdges - 1) * gap) / 2;
    const offsetValue = offsetIndex * gap - centerOffset;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const finalOffset = edge.curvature !== undefined ? edge.curvature : offsetValue;
    const shiftedStart = { x: start.x + nx * (finalOffset / 2), y: start.y + ny * (finalOffset / 2) };
    const shiftedEnd = { x: end.x + nx * (finalOffset / 2), y: end.y + ny * (finalOffset / 2) };

    if (edge.pathType === 'orthogonal') {
      const elbowX = shiftedStart.x + (shiftedEnd.x - shiftedStart.x) / 2;
      const d = `M ${shiftedStart.x} ${shiftedStart.y} L ${elbowX} ${shiftedStart.y} L ${elbowX} ${shiftedEnd.y} L ${shiftedEnd.x} ${shiftedEnd.y}`;
      return {
        d,
        labelX: elbowX,
        labelY: (shiftedStart.y + shiftedEnd.y) / 2,
        shiftedStart,
        shiftedEnd
      };
    }

    const [bezierD, labelX, labelY] = getBezierPath({
      sourceX: shiftedStart.x,
      sourceY: shiftedStart.y,
      sourcePosition: getHandlePosition(edge.sourcePortIdx),
      targetX: shiftedEnd.x,
      targetY: shiftedEnd.y,
      targetPosition: getHandlePosition(edge.targetPortIdx),
      curvature: 0.16
    });

    return {
      d: bezierD,
      labelX,
      labelY,
      shiftedStart,
      shiftedEnd
    };
  }, [edge.curvature, edge.pathType, edge.sourcePortIdx, edge.targetPortIdx, end.x, end.y, offsetIndex, start.x, start.y, totalEdges]);

  const strokeWidth = isSelected ? 3.0 : isHovered ? 2.2 : clamp(edge.thickness || 1.5, 1.2, 1.75);
  const strokeColor = isSelected ? railColor : isHovered ? railColor : neutralColor;
  const strokeOpacity = isSelected ? 0.98 : isHovered ? 0.74 : 0.38;
  const hitStrokeWidth = 14;
  const reconnectHandleRadius = clamp(9 / Math.max(zoom, 0.01), 4, 20);
  const reconnectDotRadius = clamp(3.5 / Math.max(zoom, 0.01), 1.8, 8);
  const reconnectOffset = clamp(14 / Math.max(zoom, 0.01), 8, 24);
  const showLabel = showLabelAtZoom;
  const revealLabel = showLabel && (isSelected || isHovered);
  const labelText = edge.label?.trim() || edge.rail || getDirectionStage(edge.direction);
  const endAngle =
    Math.atan2(pathMeta.shiftedEnd.y - pathMeta.shiftedStart.y, pathMeta.shiftedEnd.x - pathMeta.shiftedStart.x) *
    (180 / Math.PI);
  const edgeDx = pathMeta.shiftedEnd.x - pathMeta.shiftedStart.x;
  const edgeDy = pathMeta.shiftedEnd.y - pathMeta.shiftedStart.y;
  const edgeLength = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;
  const edgeUx = edgeDx / edgeLength;
  const edgeUy = edgeDy / edgeLength;
  const reconnectSource = {
    x: pathMeta.shiftedStart.x + edgeUx * reconnectOffset,
    y: pathMeta.shiftedStart.y + edgeUy * reconnectOffset
  };
  const reconnectTarget = {
    x: pathMeta.shiftedEnd.x - edgeUx * reconnectOffset,
    y: pathMeta.shiftedEnd.y - edgeUy * reconnectOffset
  };

  return (
    <g
      className="group cursor-pointer transition-opacity duration-150"
      data-testid={`edge-${edge.id}`}
      data-edge-id={edge.id}
      data-dimmed={isDimmed ? 'true' : 'false'}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(edge.id, { x: event.clientX, y: event.clientY });
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ opacity: isDimmed ? 0.22 : 1 }}
    >
      <path
        d={pathMeta.d}
        stroke="rgba(15,23,42,0.001)"
        strokeWidth={hitStrokeWidth}
        fill="none"
        vectorEffect="non-scaling-stroke"
        style={{ pointerEvents: 'stroke' }}
      />

      <path
        d={pathMeta.d}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        strokeOpacity={strokeOpacity}
        fill="none"
        className="transition-[stroke-width,stroke,opacity] duration-150"
      />

      <path
        d={pathMeta.d}
        stroke={railColor}
        strokeWidth={isSelected ? 6 : 4}
        fill="none"
        opacity={isSelected ? 0.22 : 0}
        className="pointer-events-none transition-opacity duration-150"
      />

      {edge.sequence !== undefined && edge.sequence > 0 ? (
        <g transform={`translate(${pathMeta.labelX}, ${pathMeta.labelY})`}>
          <circle r="8" fill={railColor} />
          <text textAnchor="middle" dy="3.2" fontSize="8.3" fontWeight="bold" fill="white">
            {edge.sequence}
          </text>
        </g>
      ) : null}

      {edge.showArrowHead ? (
        <g transform={`translate(${end.x}, ${end.y}) rotate(${endAngle})`}>
          <path d="M -8.2 -4.1 L 0 0 L -8.2 4.1 Z" fill={strokeColor} opacity={isSelected ? 1 : 0.82} />
        </g>
      ) : null}

      {edge.showMidArrow ? (
        <g transform={`translate(${pathMeta.labelX}, ${pathMeta.labelY}) rotate(${endAngle})`}>
          <path d="M -6.4 -3.2 L 0 0 L -6.4 3.2 Z" fill={strokeColor} opacity={0.86} />
        </g>
      ) : null}

      {isSelected && onStartReconnect ? (
        <>
          <circle
            cx={reconnectSource.x}
            cy={reconnectSource.y}
            r={reconnectHandleRadius}
            fill="rgba(15,23,42,0.001)"
            className="cursor-pointer"
            stroke={isReconnectActive ? railColor : 'transparent'}
            strokeWidth={Math.max(1.25 / Math.max(zoom, 0.01), 0.8)}
            style={{ pointerEvents: 'all' }}
            data-testid={`edgepoint-source-${edge.id}`}
            data-canvas-interactive="true"
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              if (typeof event.currentTarget.setPointerCapture === 'function') {
                event.currentTarget.setPointerCapture(event.pointerId);
              }
              onStartReconnect(edge.id, 'source', { x: event.clientX, y: event.clientY });
            }}
          />
          <circle
            cx={reconnectSource.x}
            cy={reconnectSource.y}
            r={reconnectDotRadius}
            fill={isDarkMode ? '#e2e8f0' : '#334155'}
            className="pointer-events-none"
          />
          <circle
            cx={reconnectTarget.x}
            cy={reconnectTarget.y}
            r={reconnectHandleRadius}
            fill="rgba(15,23,42,0.001)"
            className="cursor-pointer"
            stroke={isReconnectActive ? railColor : 'transparent'}
            strokeWidth={Math.max(1.25 / Math.max(zoom, 0.01), 0.8)}
            style={{ pointerEvents: 'all' }}
            data-testid={`edgepoint-target-${edge.id}`}
            data-canvas-interactive="true"
            onPointerDown={(event) => {
              event.stopPropagation();
              event.preventDefault();
              if (typeof event.currentTarget.setPointerCapture === 'function') {
                event.currentTarget.setPointerCapture(event.pointerId);
              }
              onStartReconnect(edge.id, 'target', { x: event.clientX, y: event.clientY });
            }}
          />
          <circle
            cx={reconnectTarget.x}
            cy={reconnectTarget.y}
            r={reconnectDotRadius}
            fill={isDarkMode ? '#e2e8f0' : '#334155'}
            className="pointer-events-none"
          />
        </>
      ) : null}

      {showLabel ? (
        <foreignObject
          data-testid={`edge-label-${edge.id}`}
          x={pathMeta.labelX - 56}
          y={pathMeta.labelY - 20}
          width="112"
          height="22"
          className={`pointer-events-none overflow-visible transition-opacity duration-150 ${
            isSelected ? 'opacity-100' : isHovered ? 'opacity-90' : revealLabel ? 'opacity-65' : 'opacity-0'
          }`}
        >
          <div className="flex justify-center">
            <div
              className={`rounded-full border px-1.5 py-[1px] text-[9px] font-medium tracking-[0.01em] whitespace-nowrap backdrop-blur ${
                isSelected
                  ? isDarkMode
                    ? 'border-indigo-300/55 bg-indigo-500/16 text-indigo-100'
                    : 'border-indigo-300/65 bg-indigo-50/80 text-indigo-700'
                  : isHovered
                    ? isDarkMode
                      ? 'border-slate-500/70 bg-slate-950/75 text-slate-200'
                      : 'border-slate-300/80 bg-white/85 text-slate-700'
                    : isDarkMode
                      ? 'border-slate-700/55 bg-slate-950/65 text-slate-300'
                      : 'border-slate-300/55 bg-white/70 text-slate-500'
              }`}
            >
              {labelText}
            </div>
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
};

const DiagramEdgePath = React.memo(DiagramEdgePathComponent);
export default DiagramEdgePath;
