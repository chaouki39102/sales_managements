// ════════════════════════════════════════════════════════════════════════════
// pos/hooks/usePosSafeToast.ts
//
// Toast proxy shared by the POS screens: the real `sonner` toast when toasts
// are enabled in the POS settings, a silent no-op proxy otherwise.
// ════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { toast } from 'sonner';

export type PosSafeToast = typeof toast;

export function usePosSafeToast(toastEnabled: boolean): PosSafeToast {
  return useMemo(() => {
    if (toastEnabled) return toast;
    return new Proxy(toast, {
      get: (_target, prop) => {
        if (prop === 'dismiss' || prop === 'remove') return () => {};
        return () => '';
      },
    });
  }, [toastEnabled]);
}
