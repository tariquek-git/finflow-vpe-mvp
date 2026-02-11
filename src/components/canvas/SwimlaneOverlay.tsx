import { ViewportPortal } from '@xyflow/react';
import { GripHorizontal, GripVertical, Pencil } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { LaneOrientation, Swimlane } from '../../types';

const EXTENT = 14000;

interface Props {
  lanes: Swimlane[];
  orientation: LaneOrientation;
  visible: boolean;
  darkMode: boolean;
  onRename: (id: string, label: string) => void;
  onResize: (id: string, size: number) => void;
}

interface ResizeState {
  id: string;
  startSize: number;
  startCoord: number;
}

export function SwimlaneOverlay({ lanes, orientation, visible, darkMode, onRename, onResize }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const dragState = useRef<ResizeState | null>(null);

  const ordered = useMemo(() => [...lanes].sort((a, b) => a.order - b.order).filter((lane) => lane.visible), [lanes]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!dragState.current) {
        return;
      }
      const delta =
        orientation === 'horizontal'
          ? event.clientY - dragState.current.startCoord
          : event.clientX - dragState.current.startCoord;
      onResize(dragState.current.id, dragState.current.startSize + delta);
    };

    const onUp = () => {
      dragState.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [onResize, orientation]);

  if (!visible) {
    return null;
  }

  const fullSize = ordered.reduce((sum, lane) => sum + lane.size, 0);
  const startBase = -fullSize / 2;

  return (
    <ViewportPortal>
      <div className="pointer-events-none absolute inset-0 -z-10" data-swimlane-overlay="true">
        {ordered.map((lane, index) => {
          const before = ordered.slice(0, index).reduce((sum, item) => sum + item.size, 0);
          const start = startBase + before;
          const end = start + lane.size;

          const laneFrame =
            orientation === 'horizontal'
              ? { left: -EXTENT / 2, top: start, width: EXTENT, height: lane.size }
              : { top: -EXTENT / 2, left: start, width: lane.size, height: EXTENT };

          const labelPos =
            orientation === 'horizontal'
              ? { top: start + 8, left: -EXTENT / 2 + 12 }
              : { top: -EXTENT / 2 + 8, left: start + 8 };

          const resizeGrip =
            orientation === 'horizontal'
              ? { left: -EXTENT / 2, top: end - 4, width: EXTENT, height: 8, cursor: 'row-resize' }
              : { top: -EXTENT / 2, left: end - 4, width: 8, height: EXTENT, cursor: 'col-resize' };

          return (
            <div key={lane.id}>
              <div
                style={laneFrame}
                className={
                  darkMode
                    ? 'absolute border border-slate-700/50 bg-slate-800/20'
                    : 'absolute border border-slate-300/70 bg-blue-50/35'
                }
              />

              <div style={labelPos} className="pointer-events-auto absolute">
                {editingId === lane.id ? (
                  <input
                    autoFocus
                    value={draftLabel}
                    onChange={(event) => setDraftLabel(event.target.value)}
                    onBlur={() => {
                      onRename(lane.id, draftLabel.trim() || 'Unnamed Lane');
                      setEditingId(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        onRename(lane.id, draftLabel.trim() || 'Unnamed Lane');
                        setEditingId(null);
                      }
                      if (event.key === 'Escape') {
                        setEditingId(null);
                      }
                    }}
                    className={
                      darkMode
                        ? 'w-44 rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100'
                        : 'w-44 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-900'
                    }
                  />
                ) : (
                  <button
                    type="button"
                    onDoubleClick={() => {
                      setEditingId(lane.id);
                      setDraftLabel(lane.label);
                    }}
                    className={
                      darkMode
                        ? 'inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-900/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-200'
                        : 'inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-700'
                    }
                  >
                    <Pencil size={10} />
                    {lane.label}
                  </button>
                )}
              </div>

              {index < ordered.length - 1 && (
                <div
                  style={resizeGrip}
                  className={darkMode ? 'pointer-events-auto absolute hover:bg-slate-500/25' : 'pointer-events-auto absolute hover:bg-slate-300/50'}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    dragState.current = {
                      id: lane.id,
                      startSize: lane.size,
                      startCoord: orientation === 'horizontal' ? event.clientY : event.clientX,
                    };
                  }}
                >
                  <div className="pointer-events-none flex h-full w-full items-center justify-center">
                    {orientation === 'horizontal' ? (
                      <GripHorizontal size={12} className="text-slate-500" />
                    ) : (
                      <GripVertical size={12} className="text-slate-500" />
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ViewportPortal>
  );
}
