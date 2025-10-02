/**
 * API Module - Types and Utilities
 *
 * Centralized exports for all API-related functionality
 */

// Error handling
export { ApiErrorHandler } from './errors';
export type { ApiError } from './errors';
export { ApiErrorCode } from './errors';

// Response handling
export { ApiResponseHandler } from './responses';
export type {
  MetadataValue,
  MetadataObject,
  ApiResponse,
  ApiSuccess,
  PaginatedResponse,
} from './responses';

// Common types for API development
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface RequestContext {
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: Date;
  version: string;
  services: {
    database: 'healthy' | 'unhealthy';
    auth: 'healthy' | 'unhealthy';
    billing: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
  };
  uptime: number;
}

// File upload types
export interface FileUploadRequest {
  file: File;
  directory?: string;
  filename?: string;
  metadata?: Record<string, string>;
}

export interface FileUploadResponse {
  url: string;
  key: string;
  size: number;
  contentType: string;
  uploadedAt: Date;
}

// Webhook types
export interface WebhookPayload<T = Record<string, unknown>> {
  id: string;
  type: string;
  data: T;
  timestamp: number;
  signature?: string;
}

export interface WebhookResponse {
  received: boolean;
  processed: boolean;
  error?: string;
}

// Search and filtering
export interface SearchParams {
  query?: string;
  filters?: Record<string, string | string[]>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  limit?: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

// Batch operations
export interface BatchRequest<T> {
  items: T[];
  batchId?: string;
}

export interface BatchResponse<T> {
  batchId: string;
  results: Array<{
    success: boolean;
    data?: T;
    error?: string;
    index: number;
  }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

// Async operation configuration for hooks
export interface AsyncOperationOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

// Form submission configuration for hooks
export interface FormSubmissionOptions<T> {
  onSubmit: (data: T) => Promise<void>;
  onSuccess?: (data: T) => void;
  onError?: (error: unknown, data: T) => void;
  successMessage?: string;
  errorMessage?: string;
}

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

// Next.js specific types
export type NextApiResponse<T = unknown> = import('next/server').NextResponse<
  import('./responses').ApiResponse<T>
>;

export interface RouteHandlerContext {
  params: Record<string, string>;
  searchParams: Record<string, string>;
}
