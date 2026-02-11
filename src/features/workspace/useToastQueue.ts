import { useCallback, useState } from 'react';
import type { ToastItem } from '../../components/shared/ToastHost';

export function useToastQueue(timeoutMs = 2200) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback(
    (message: string, tone: ToastItem['tone'] = 'info') => {
      const id = `t-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
      setToasts((current) => [...current, { id, message, tone }]);

      window.setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
      }, timeoutMs);
    },
    [timeoutMs],
  );

  return { toasts, pushToast };
}
