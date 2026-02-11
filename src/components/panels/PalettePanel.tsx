import { ChevronDown, ChevronRight, GripVertical, Layers } from 'lucide-react';
import { useMemo, useState, type DragEvent } from 'react';
import { NODE_CATEGORIES } from '../../data/schema';
import type { NodeType } from '../../types';

interface Props {
  onOpenLaneManager: () => void;
}

export function PalettePanel({ onOpenLaneManager }: Props) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NODE_CATEGORIES.map((group, index) => [group.title, index === 0])),
  );

  const allNodes = useMemo(() => NODE_CATEGORIES.flatMap((group) => group.items), []);

  const onDragStart = (event: DragEvent<HTMLButtonElement>, nodeType: NodeType) => {
    event.dataTransfer.setData('application/x-node-type', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="flex h-full w-[320px] flex-col border-r border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/50">
      <div className="mb-3 rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
          <Layers size={12} />
          Node Palette
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">Drag a node type to the canvas.</p>
      </div>

      <button
        type="button"
        onClick={onOpenLaneManager}
        className="mb-3 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Manage Swimlanes
      </button>

      <div className="flex-1 space-y-2 overflow-auto pr-1">
        {NODE_CATEGORIES.map((group) => {
          const open = openGroups[group.title] ?? false;
          return (
            <section key={group.title} className="rounded-xl border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() =>
                  setOpenGroups((prev) => ({
                    ...prev,
                    [group.title]: !open,
                  }))
                }
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  {group.title}
                </span>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {open && (
                <div className="space-y-1 border-t border-slate-200 p-2 dark:border-slate-700">
                  {group.items.map((nodeType) => (
                    <button
                      key={nodeType}
                      type="button"
                      draggable
                      onDragStart={(event) => onDragStart(event, nodeType)}
                      className="group flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-left text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-blue-500 dark:hover:bg-slate-800"
                    >
                      <GripVertical size={12} className="text-slate-400" />
                      <span className="truncate">{nodeType}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-slate-300 bg-white p-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        {allNodes.length} node types
      </div>
    </aside>
  );
}
