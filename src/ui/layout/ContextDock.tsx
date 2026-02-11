import { Link2, SquarePen, Trash2, Copy, MoveHorizontal } from 'lucide-react';
import { motion } from 'motion/react';
import type { FlowEdge, FlowNode } from '../../core/types';

interface Props {
  selectedNode: FlowNode | null;
  selectedEdge: FlowEdge | null;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdateEdgeRail: (rail: string) => void;
}

const rails = ['Blank', 'ACH (Same-day)', 'FedNow', 'RTP', 'Wire'];

export function ContextDock({ selectedNode, selectedEdge, onDelete, onDuplicate, onUpdateEdgeRail }: Props) {
  if (!selectedNode && !selectedEdge) {
    return null;
  }

  const edgeRail = selectedEdge?.data?.rail ?? 'Blank';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-300/75 bg-white/94 px-2 py-2 shadow-[0_12px_24px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/88"
    >
      {selectedNode && (
        <>
          <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <SquarePen size={12} />
            Node
          </div>
          <button
            type="button"
            onClick={onDuplicate}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-300/80 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Copy size={12} />
            Duplicate
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-300/80 bg-white px-2 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-700/70 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </>
      )}

      {selectedEdge && (
        <>
          <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Link2 size={12} />
            Edge
          </div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-300/80 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900">
            <MoveHorizontal size={12} className="text-slate-500 dark:text-slate-300" />
            {rails.map((rail) => {
              const active = edgeRail === rail;
              return (
                <button
                  key={rail}
                  type="button"
                  onClick={() => onUpdateEdgeRail(rail)}
                  className={
                    active
                      ? 'rounded-lg bg-cyan-500 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white'
                      : 'rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                  }
                >
                  {rail.replace(' (Same-day)', '').replace(' ', '')}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1 rounded-xl border border-rose-300/80 bg-white px-2 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 dark:border-rose-700/70 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40"
          >
            <Trash2 size={12} />
            Delete
          </button>
        </>
      )}
    </motion.div>
  );
}
