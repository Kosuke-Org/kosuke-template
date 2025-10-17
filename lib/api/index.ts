/**
 * API Module - Types and Utilities
 *
 * Centralized exports for all API-related functionality
 */

// Response handling
export { ApiResponseHandler } from './responses';
export type { MetadataValue, MetadataObject, ApiSuccess } from './responses';

// Toast system types
export type ToastType = 'default' | 'destructive';

export interface ToastOptions {
  title: string;
  description: string;
  variant?: ToastType;
}

export interface ToastHook {
  toast: (options: ToastOptions) => void;
}
