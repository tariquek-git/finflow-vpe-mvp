import React, { useMemo, useState } from 'react';
import { Node, ViewportTransform } from '../../types';
import { getNodeDimensions } from './canvasGeometry';

type MiniMapPanelProps = {
  nodes: Node[];
  viewport: ViewportTransform;
  canvasSize: { width: number; height: number };
  isDarkMode: boolean;
  onViewportChange: (viewport: ViewportTransform) => void;
};

const MINIMAP_WIDTH = 220;
const MINIMAP_HEIGHT = 140;
const MIN_BOUNDS_SIZE = 600;

type Bounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

const getBounds = (nodes: Node[]): Bounds => {
  if (nodes.length === 0) {
    return { minX: -300, minY: -220, width: 900, height: 600 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const { width, height } = getNodeDimensions(node);
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + width);
    maxY = Math.max(maxY, node.position.y + height);
  }

  const worldWidth = Math.max(maxX - minX, MIN_BOUNDS_SIZE);
  const worldHeight = Math.max(maxY - minY, MIN_BOUNDS_SIZE);

  return {
    minX: minX - 100,
    minY: minY - 100,
    width: worldWidth + 200,
    height: worldHeight + 200
  };
};

const MiniMapPanel: React.FC<MiniMapPanelProps> = ({ nodes, viewport, canvasSize, isDarkMode, onViewportChange }) => {
  const [isDraggingViewport, setIsDraggingViewport] = useState(false);
  const bounds = useMemo(() => getBounds(nodes), [nodes]);

  const worldToMini = (x: number, y: number) => ({
    x: ((x - bounds.minX) / bounds.width) * MINIMAP_WIDTH,
    y: ((y - bounds.minY) / bounds.height) * MINIMAP_HEIGHT
  });

  const miniToWorld = (x: number, y: number) => ({
    x: bounds.minX + (x / MINIMAP_WIDTH) * bounds.width,
    y: bounds.minY + (y / MINIMAP_HEIGHT) * bounds.height
  });

  const viewportWorld = {
    left: -viewport.x / viewport.zoom,
    top: -viewport.y / viewport.zoom,
    width: canvasSize.width / viewport.zoom,
    height: canvasSize.height / viewport.zoom
  };

  const miniTopLeft = worldToMini(viewportWorld.left, viewportWorld.top);
  const miniBottomRight = worldToMini(
    viewportWorld.left + viewportWorld.width,
    viewportWorld.top + viewportWorld.height
  );

  const viewportRect = {
    x: miniTopLeft.x,
    y: miniTopLeft.y,
    width: Math.max(16, miniBottomRight.x - miniTopLeft.x),
    height: Math.max(12, miniBottomRight.y - miniTopLeft.y)
  };

  const panToMiniPoint = (clientX: number, clientY: number, target: HTMLDivElement) => {
    const rect = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(MINIMAP_WIDTH, clientX - rect.left));
    const y = Math.max(0, Math.min(MINIMAP_HEIGHT, clientY - rect.top));

    const world = miniToWorld(x, y);

    onViewportChange({
      ...viewport,
      x: canvasSize.width / 2 - world.x * viewport.zoom,
      y: canvasSize.height / 2 - world.y * viewport.zoom
    });
  };

  return (
    <div
      data-testid="canvas-minimap"
      data-canvas-interactive="true"
      className={`pointer-events-auto absolute bottom-3 right-3 z-30 rounded-2xl border p-2 shadow-md ${
        isDarkMode ? 'border-slate-700 bg-slate-900/92' : 'border-slate-200 bg-white/92'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={(event) => panToMiniPoint(event.clientX, event.clientY, event.currentTarget)}
        onMouseDown={(event) => {
          setIsDraggingViewport(true);
          panToMiniPoint(event.clientX, event.clientY, event.currentTarget);
        }}
        onMouseMove={(event) => {
          if (!isDraggingViewport) return;
          panToMiniPoint(event.clientX, event.clientY, event.currentTarget);
        }}
        onMouseUp={() => setIsDraggingViewport(false)}
        onMouseLeave={() => setIsDraggingViewport(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            const worldX = bounds.minX + (MINIMAP_WIDTH / 2 / MINIMAP_WIDTH) * bounds.width;
            const worldY = bounds.minY + (MINIMAP_HEIGHT / 2 / MINIMAP_HEIGHT) * bounds.height;
            onViewportChange({
              ...viewport,
              x: canvasSize.width / 2 - worldX * viewport.zoom,
              y: canvasSize.height / 2 - worldY * viewport.zoom
            });
          }
        }}
        className={`relative cursor-pointer overflow-hidden rounded-xl border ${
          isDraggingViewport
            ? isDarkMode
              ? 'border-cyan-400/60 bg-slate-950'
              : 'border-cyan-500/60 bg-slate-50'
            : isDarkMode
              ? 'border-slate-700 bg-slate-950'
              : 'border-slate-200 bg-slate-50'
        }`}
        style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
      >
        <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} className="absolute inset-0">
          {nodes.map((node) => {
            const { width, height } = getNodeDimensions(node);
            const topLeft = worldToMini(node.position.x, node.position.y);
            const bottomRight = worldToMini(node.position.x + width, node.position.y + height);

            return (
              <rect
                key={`mini-${node.id}`}
                x={topLeft.x}
                y={topLeft.y}
                width={Math.max(3, bottomRight.x - topLeft.x)}
                height={Math.max(3, bottomRight.y - topLeft.y)}
                rx={2}
                fill={isDarkMode ? '#76879f' : '#94a3b8'}
                opacity={0.9}
              />
            );
          })}
          <rect
            x={viewportRect.x}
            y={viewportRect.y}
            width={viewportRect.width}
            height={viewportRect.height}
            fill="rgba(8, 145, 178, 0.13)"
            stroke="rgba(8, 145, 178, 0.9)"
            strokeWidth="1"
            rx={3}
          />
        </svg>
      </div>
    </div>
  );
};

export default MiniMapPanel;
