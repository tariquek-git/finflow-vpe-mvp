import { PenTool, StickyNote, Type, Wrench, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';

interface Props {
  onPick: (tool: 'pen' | 'text' | 'sticky') => void;
}

function Tool({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/80 bg-white text-slate-700 transition hover:-translate-y-[1px] hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-300"
      title={label}
      aria-label={label}
    >
      <Icon size={14} />
    </button>
  );
}

export function QuickTools({ onPick }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: 'easeOut' }}
      className="saas-fade-up inline-flex items-center gap-1.5 rounded-2xl border border-slate-300/75 bg-white/88 p-2 shadow-[0_12px_30px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/80"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300/80 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-300"
      >
        <Wrench size={13} />
        Tools
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -8, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="inline-flex items-center gap-1.5"
          >
            <Tool icon={PenTool} label="Pen" onClick={() => onPick('pen')} />
            <Tool icon={Type} label="Text" onClick={() => onPick('text')} />
            <Tool icon={StickyNote} label="Sticky" onClick={() => onPick('sticky')} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
