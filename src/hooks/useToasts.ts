import { useCallback, useState } from 'react';
import { makeId } from '../core/builders';
import type { ToastItem, ToastType } from '../ui/common/ToastHost';

export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((message: string, type: ToastType) => {
    const id = makeId('toast');
    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2400);
  }, []);

  return {
    toasts,
    pushToast,
  };
}
