import React, { useEffect, useRef, useState } from 'react';
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
  onSelect: (id: string) => void;
};

const getDirectionStage = (direction: FlowDirection) => {
  if (direction === FlowDirection.AUTH) return 'Auth';
  if (direction === FlowDirection.SETTLEMENT) return 'Settlement';
  if (direction === FlowDirection.RETURN) return 'Return';
  if (direction === FlowDirection.PULL) return 'Capture';
  return 'Transfer';
};

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
  onSelect
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [transientPath, setTransientPath] = useState<{
    d: string;
    color: string;
    dash: string;
  } | null>(null);
  const [transientVisible, setTransientVisible] = useState(false);
  const previousPathRef = useRef<string | null>(null);
  const fadeTimeoutRef = useRef<number | null>(null);
  const start = getPortPosition(source, edge.sourcePortIdx);
  const end = getPortPosition(target, edge.targetPortIdx);

  const gap = 30;
  const centerOffset = ((totalEdges - 1) * gap) / 2;
  const offsetValue = offsetIndex * gap - centerOffset;

  const strokeColor = edge.isExceptionPath ? '#ef4444' : RAIL_COLORS[edge.rail] || '#94a3b8';
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
  const showLabel = showLabelAtZoom;
  const shouldRevealLabel = showLabel && (isSelected || isHovered);

  useEffect(() => {
    const previousPath = previousPathRef.current;
    if (previousPath && previousPath !== pathD) {
      setTransientPath({
        d: previousPath,
        color: strokeColor,
        dash: strokeDash
      });
      setTransientVisible(true);
      window.requestAnimationFrame(() => {
        setTransientVisible(false);
      });

      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
      fadeTimeoutRef.current = window.setTimeout(() => {
        setTransientPath(null);
      }, 170);
    }

    previousPathRef.current = pathD;
  }, [pathD, strokeColor, strokeDash]);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current !== null) {
        window.clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <g
      className="group cursor-pointer transition-opacity duration-150"
      data-testid={`edge-${edge.id}`}
      data-edge-id={edge.id}
      data-dimmed={isDimmed ? 'true' : 'false'}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(edge.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ opacity: isDimmed ? 0.2 : 1 }}
    >
      <path d={pathD} stroke="transparent" strokeWidth="16" fill="none" />

      {transientPath ? (
        <path
          d={transientPath.d}
          stroke={transientPath.color}
          strokeWidth={isSelected ? 4.6 : edge.thickness ? Math.max(2, edge.thickness) : 2.2}
          strokeDasharray={transientPath.dash}
          fill="none"
          opacity={transientVisible ? 0.42 : 0}
          className="pointer-events-none transition-opacity duration-[160ms]"
        />
      ) : null}

      <path
        d={pathD}
        stroke={strokeColor}
        strokeWidth={isSelected ? 4.6 : edge.thickness ? Math.max(2, edge.thickness) : 2.2}
        strokeDasharray={strokeDash}
        fill="none"
        className="transition-[stroke-width,opacity] duration-150"
      />

      <path
        d={pathD}
        stroke={strokeColor}
        strokeWidth={isSelected ? 10 : 7}
        fill="none"
        opacity={isSelected ? 0.44 : 0}
        className="pointer-events-none transition-opacity duration-150 group-hover:opacity-30"
      />

      {edge.sequence !== undefined && edge.sequence > 0 ? (
        <g transform={`translate(${midPoint.x}, ${midPoint.y})`}>
          <circle r="9" fill={strokeColor} />
          <text textAnchor="middle" dy="3.5" fontSize="9" fontWeight="bold" fill="white">
            {edge.sequence}
          </text>
        </g>
      ) : null}

      {edge.showArrowHead ? (
        <g transform={`translate(${end.x}, ${end.y}) rotate(${endAngle})`}>
          <path d="M -10 -5 L 0 0 L -10 5 Z" fill={strokeColor} />
        </g>
      ) : null}

      {edge.showMidArrow ? (
        <g transform={`translate(${midPoint.x}, ${midPoint.y}) rotate(${endAngle})`}>
          <path d="M -8 -4 L 0 0 L -8 4 Z" fill={strokeColor} />
        </g>
      ) : null}

      {showLabel ? (
        <foreignObject
          data-testid={`edge-label-${edge.id}`}
          x={midPoint.x - 70}
          y={midPoint.y - (finalOffset > 0 ? 58 : -16)}
          width="140"
          height="50"
          className={`pointer-events-none overflow-visible transition-opacity duration-150 ${
            shouldRevealLabel ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
            <div
              className={`rounded-full border px-2.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.06em] whitespace-nowrap shadow-sm ${
                isDarkMode
                  ? 'border-slate-600 bg-slate-900/95 text-slate-100'
                  : 'border-slate-300 bg-white/95 text-slate-700'
              }`}
            >
              {edge.label || edge.rail || getDirectionStage(edge.direction)}
              {edge.amount ? <span className="ml-1 text-emerald-500">${edge.amount}</span> : null}
            </div>
            <div
              className={`mt-1 rounded-full border px-1.5 py-[1px] text-[7px] font-semibold uppercase tracking-[0.08em] ${
                isDarkMode
                  ? 'border-slate-700/90 bg-slate-900/90 text-slate-300'
                  : 'border-slate-300/90 bg-white/90 text-slate-500'
              }`}
            >
              {edge.rail || getDirectionStage(edge.direction)}
            </div>
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
};

const DiagramEdgePath = React.memo(DiagramEdgePathComponent);
export default DiagramEdgePath;
