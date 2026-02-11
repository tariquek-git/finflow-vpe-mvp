import { useMemo, useState } from 'react';
import {
  ArrowDownWideNarrow,
  ArrowLeftRight,
  Eye,
  GripVertical,
  LayoutPanelLeft,
  Plus,
  X,
} from 'lucide-react';
import type { LaneOrientation, Swimlane } from '../../core/types';

interface Props {
  open: boolean;
  lanes: Swimlane[];
  orientation: LaneOrientation;
  onClose: () => void;
  onOrientation: (value: LaneOrientation) => void;
  onAdd: () => void;
  onRename: (id: string, label: string) => void;
  onVisible: (id: string, visible: boolean) => void;
  onReorder: (ids: string[]) => void;
}

export function LaneManagerModal(props: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const lanes = useMemo(() => [...props.lanes].sort((a, b) => a.order - b.order), [props.lanes]);

  if (!props.open) {
    return null;
  }

  const reorder = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      return;
    }

    const ids = lanes.map((lane) => lane.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      return;
    }

    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    props.onReorder(next);
  };

  const tab = (active: boolean): string =>
    active
      ? 'inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white'
      : 'inline-flex items-center gap-1 rounded-lg border border-slate-300/70 bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200';

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="saas-scale-in w-full max-w-2xl rounded-3xl border border-slate-300/70 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100">
            <LayoutPanelLeft size={15} />
            Swimlane Manager
          </h3>
          <button
            type="button"
            onClick={props.onClose}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300/70 bg-white px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <X size={12} />
            Close
          </button>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            className={tab(props.orientation === 'horizontal')}
            onClick={() => props.onOrientation('horizontal')}
          >
            <ArrowDownWideNarrow size={12} />
            Horizontal
          </button>
          <button
            type="button"
            className={tab(props.orientation === 'vertical')}
            onClick={() => props.onOrientation('vertical')}
          >
            <ArrowLeftRight size={12} />
            Vertical
          </button>
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white dark:border-blue-400/40 dark:bg-blue-500"
            onClick={props.onAdd}
          >
            <Plus size={12} />
            Add Lane
          </button>
        </div>

        <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
          {lanes.map((lane) => (
            <div
              key={lane.id}
              draggable
              onDragStart={() => setDragId(lane.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => reorder(lane.id)}
              onDragEnd={() => setDragId(null)}
              className="inline-flex w-full items-center gap-2 rounded-xl border border-slate-300/70 bg-slate-50 p-2 transition hover:border-blue-300 dark:border-slate-700 dark:bg-slate-800/70"
            >
              <GripVertical className="cursor-grab text-blue-600 dark:text-blue-300" size={15} />
              <input
                value={lane.label}
                onChange={(e) => props.onRename(lane.id, e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
              <label className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300">
                <Eye size={12} />
                <input
                  type="checkbox"
                  checked={lane.visible}
                  onChange={(e) => props.onVisible(lane.id, e.target.checked)}
                />
                Visible
              </label>
            </div>
          ))}
        </div>

        <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
          Drag rows to reorder lanes. Resize lane thickness directly from canvas separators.
        </p>
      </div>
    </div>
  );
}
