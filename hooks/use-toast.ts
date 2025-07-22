'use client';

import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import type { ToastOptions, ToastHook } from '@/lib/api';

// Toast hook implementation using sonner
export function useToast(): ToastHook {
  const toast = useCallback(({ title, description, variant = 'default' }: ToastOptions) => {
    if (variant === 'destructive') {
      sonnerToast.error(title, {
        description,
      });
    } else {
      // For default/info toasts, use the regular toast without success styling
      sonnerToast(title, {
        description,
      });
    }
  }, []);

  return { toast };
}
