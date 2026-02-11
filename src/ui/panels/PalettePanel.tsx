import { useMemo, useState, type DragEvent } from 'react';
import { ChevronRight, GripVertical, LayoutPanelLeft, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { NODE_CATEGORIES } from '../../core/schema';
import type { Swimlane } from '../../core/types';
import { categoryIconMap, nodeIconMap } from '../common/icons';

interface Props {
  open: boolean;
  lanes: Swimlane[];
  onOpenLanes: () => void;
  onClose: () => void;
}

export function PalettePanel({ open, lanes, onOpenLanes, onClose }: Props) {
  const [active, setActive] = useState<string>(NODE_CATEGORIES[0]?.title ?? 'Institutions');
  const visibleLanes = useMemo(() => lanes.filter((lane) => lane.visible).length, [lanes]);
  const current = NODE_CATEGORIES.find((group) => group.title === active) ?? NODE_CATEGORIES[0];

  const startDrag = (event: DragEvent<HTMLButtonElement>, type: string) => {
    event.dataTransfer.setData('application/x-bank-node', type);
    event.dataTransfer.effectAllowed = 'move';
    onClose();
  };

  return (
    <AnimatePresence>
      {open && current && (
        <motion.section
          key="palette-panel"
          initial={{ opacity: 0, x: -12, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -10, scale: 0.985 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-[320px] rounded-2xl border border-slate-300/75 bg-white/94 p-3 shadow-[0_14px_32px_rgba(15,23,42,0.16)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <LayoutPanelLeft size={13} />
              Node Library
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-300/80 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Close library"
            >
              <X size={13} />
            </button>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-1.5">
            {NODE_CATEGORIES.map((group) => {
              const Icon = categoryIconMap[group.title];
              const selected = group.title === active;
              return (
                <button
                  key={group.title}
                  type="button"
                  onClick={() => setActive(group.title)}
                  className={
                    selected
                      ? 'inline-flex items-center justify-center gap-1 rounded-xl bg-cyan-500 px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white'
                      : 'inline-flex items-center justify-center gap-1 rounded-xl border border-slate-300/80 bg-white px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }
                >
                  <Icon size={11} />
                  {group.title}
                </button>
              );
            })}
          </div>

          <div className="max-h-[50vh] space-y-1.5 overflow-auto pr-0.5">
            {current.items.map((item) => {
              const Icon = nodeIconMap[item];
              return (
                <button
                  key={item}
                  type="button"
                  draggable
                  onDragStart={(event) => startDrag(event, item)}
                  className="group inline-flex w-full items-center gap-2 rounded-xl border border-slate-300/70 bg-white px-2.5 py-2 text-left text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50/60 hover:shadow-sm active:cursor-grabbing dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-cyan-500 dark:hover:bg-slate-800"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300">
                    <Icon size={14} />
                  </span>
                  <span className="flex-1">{item}</span>
                  <GripVertical size={12} className="text-slate-400" />
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
            onClick={onOpenLanes}
          >
            {visibleLanes}/{lanes.length} lanes visible
            <ChevronRight size={12} />
          </button>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
