import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { ViewportPortal } from '@xyflow/react';
import { GripHorizontal, GripVertical, Pencil } from 'lucide-react';
import type { LaneOrientation, Swimlane } from '../../core/types';

const EXTENT = 12000;

interface Props {
  lanes: Swimlane[];
  orientation: LaneOrientation;
  visible: boolean;
  darkMode: boolean;
  onRename: (id: string, value: string) => void;
  onResize: (id: string, nextSize: number) => void;
}

interface DragSize {
  id: string;
  startSize: number;
  startCoord: number;
}

export function LaneOverlay({ lanes, orientation, visible, darkMode, onRename, onResize }: Props) {
  const ordered = useMemo(() => [...lanes].sort((a, b) => a.order - b.order).filter((x) => x.visible), [lanes]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const drag = useRef<DragSize | null>(null);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      if (!drag.current) {
        return;
      }

      const diff =
        orientation === 'horizontal' ? event.clientY - drag.current.startCoord : event.clientX - drag.current.startCoord;
      onResize(drag.current.id, drag.current.startSize + diff);
    };

    const onUp = () => {
      drag.current = null;
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

  const full = ordered.reduce((sum, lane) => sum + lane.size, 0);
  const begin = -full / 2;

  return (
    <ViewportPortal>
      <div className="pointer-events-none absolute inset-0 -z-10" data-capture-layer="swimlane">
        {ordered.map((lane, index) => {
          const offset = ordered.slice(0, index).reduce((sum, x) => sum + x.size, 0);
          const start = begin + offset;
          const end = start + lane.size;

          const frame =
            orientation === 'horizontal'
              ? { left: -EXTENT / 2, top: start, width: EXTENT, height: lane.size }
              : { top: -EXTENT / 2, left: start, width: lane.size, height: EXTENT };

          const badge =
            orientation === 'horizontal'
              ? { left: -EXTENT / 2 + 18, top: start + 10 }
              : { left: start + 10, top: -EXTENT / 2 + 18 };

          const grip =
            orientation === 'horizontal'
              ? { left: -EXTENT / 2, top: end - 4, width: EXTENT, height: 8, cursor: 'row-resize' }
              : { top: -EXTENT / 2, left: end - 4, width: 8, height: EXTENT, cursor: 'col-resize' };

          return (
            <div key={lane.id}>
              <div
                style={frame}
                className={clsx(
                  'absolute border',
                  darkMode
                    ? 'border-slate-700/55 bg-slate-800/18'
                    : 'border-slate-300/65 bg-cyan-50/25',
                )}
              />

              <div style={badge} className="pointer-events-auto absolute">
                {editing === lane.id ? (
                  <input
                    value={draft}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => {
                      onRename(lane.id, draft.trim() || 'Unnamed Lane');
                      setEditing(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onRename(lane.id, draft.trim() || 'Unnamed Lane');
                        setEditing(null);
                      }
                      if (e.key === 'Escape') {
                        setEditing(null);
                      }
                    }}
                    className={clsx(
                      'w-48 rounded-xl border px-2 py-1 text-xs font-semibold outline-none',
                      darkMode
                        ? 'border-slate-600 bg-slate-900 text-slate-100'
                        : 'border-slate-300 bg-white text-slate-900',
                    )}
                  />
                ) : (
                  <button
                    type="button"
                    onDoubleClick={() => {
                      setEditing(lane.id);
                      setDraft(lane.label);
                    }}
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold uppercase tracking-wide',
                      darkMode
                        ? 'border-slate-600 bg-slate-900/95 text-slate-200'
                        : 'border-slate-300 bg-white text-slate-700',
                    )}
                  >
                    <Pencil size={10} />
                    {lane.label}
                  </button>
                )}
              </div>

              {index < ordered.length - 1 && (
                <div
                  className={clsx(
                    'pointer-events-auto absolute transition-colors',
                    darkMode ? 'hover:bg-slate-500/30' : 'hover:bg-slate-300/70',
                  )}
                  style={grip}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    drag.current = {
                      id: lane.id,
                      startSize: lane.size,
                      startCoord: orientation === 'horizontal' ? e.clientY : e.clientX,
                    };
                  }}
                >
                  <div className="pointer-events-none flex h-full w-full items-center justify-center">
                    {orientation === 'horizontal' ? (
                      <GripHorizontal size={11} className="text-slate-500/80" />
                    ) : (
                      <GripVertical size={11} className="text-slate-500/80" />
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
