'use client';

import { useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';

type ToastType = 'default' | 'destructive';

interface ToastOptions {
  title: string;
  description: string;
  variant?: ToastType;
}

interface ToastHook {
  toast: (options: ToastOptions) => void;
}

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
