import { AnimatePresence, motion } from 'motion/react';

export interface ToastItem {
  id: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

export function ToastHost({ items }: { items: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[320px] flex-col gap-2">
      <AnimatePresence>
        {items.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={
              toast.tone === 'error'
                ? 'rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-900 shadow'
                : toast.tone === 'success'
                  ? 'rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 shadow'
                  : 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow'
            }
          >
            {toast.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
