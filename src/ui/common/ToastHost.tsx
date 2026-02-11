import clsx from 'clsx';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

const tone: Record<ToastType, string> = {
  success: 'border-emerald-300/80 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100',
  error: 'border-rose-300/80 bg-rose-50 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100',
  info: 'border-blue-300/80 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100',
};

const iconMap = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

interface Props {
  items: ToastItem[];
}

export function ToastHost({ items }: Props) {
  return (
    <div className="pointer-events-none absolute right-4 top-4 z-[80] flex w-80 flex-col gap-2">
      {items.map((item) => {
        const Icon = iconMap[item.type];
        return (
          <div
            key={item.id}
            className={clsx(
              'saas-slide-in inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-[0_8px_20px_rgba(15,23,42,0.14)] backdrop-blur-sm',
              tone[item.type],
            )}
          >
            <Icon size={15} />
            <span>{item.message}</span>
          </div>
        );
      })}
    </div>
  );
}
