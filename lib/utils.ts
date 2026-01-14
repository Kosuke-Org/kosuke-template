import { ApiError } from '@google/genai';
import { TRPCError, TRPC_ERROR_CODE_KEY } from '@trpc/server';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names into a single string, with Tailwind CSS optimizations
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert File to base64 string for tRPC transmission
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Generate initials from a name
 * @param name - The name to generate initials from
 * @returns The first letter of the name (uppercase)
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || name.trim() === '') return '?';

  const trimmedName = name.trim();

  // Always return just the first letter
  return trimmedName.charAt(0).toUpperCase();
}

export function downloadFile(data: string, filename: string, mimeType?: string) {
  let blob: Blob;

  // Detect if data is base64 (for Excel files) or plain text (for CSV)
  if (filename.endsWith('.xlsx')) {
    // Decode base64 and create binary blob for Excel
    const binaryString = atob(data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    blob = new Blob([bytes], {
      type: mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } else {
    // Plain text blob for CSV
    blob = new Blob([data], { type: mimeType || 'text/csv;charset=utf-8;' });
  }

  const url = URL.createObjectURL(blob);
  downloadFromUrl(url, filename);
  URL.revokeObjectURL(url);
}

/**
 * Downloads a file from a URL (S3 presigned URL or API route)
 * Used for downloading documents, images, etc.
 */
export function downloadFromUrl(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank'; // Fallback: open in new tab if download fails
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Centralized error mapping for Google API errors
 * Maps HTTP status codes to appropriate tRPC error codes
 */
function mapApiErrorToTRPC(error: ApiError): TRPCError {
  const statusCodeMap: Record<
    number,
    'BAD_REQUEST' | 'NOT_FOUND' | 'CONFLICT' | 'PRECONDITION_FAILED'
  > = {
    400: 'BAD_REQUEST',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    412: 'PRECONDITION_FAILED',
  };

  const code = statusCodeMap[error.status] || 'INTERNAL_SERVER_ERROR';

  // Extract clean error message from Google API error
  // Google API errors come as JSON strings like: {"error":{"code":400,"message":"..."}}
  let parsedMessage = error.message;
  try {
    const parsed = JSON.parse(error.message);
    if (parsed.error?.message) {
      parsedMessage = parsed.error.message;
    }
  } catch {
    parsedMessage = error.message;
  }

  return new TRPCError({
    code,
    message: parsedMessage,
  });
}

/**
 * Valid tRPC error codes that can be used in services
 * Reference: https://trpc.io/docs/server/error-handling
 */
const VALID_TRPC_ERROR_CODES: readonly TRPC_ERROR_CODE_KEY[] = [
  'PARSE_ERROR',
  'BAD_REQUEST',
  'INTERNAL_SERVER_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'METHOD_NOT_SUPPORTED',
  'TIMEOUT',
  'CONFLICT',
  'PRECONDITION_FAILED',
  'PAYLOAD_TOO_LARGE',
  'UNPROCESSABLE_CONTENT',
  'TOO_MANY_REQUESTS',
  'CLIENT_CLOSED_REQUEST',
];

/**
 * Type guard to check if a value is a valid TRPC error code
 */
function isTRPCErrorCode(code: unknown): code is TRPC_ERROR_CODE_KEY {
  return typeof code === 'string' && VALID_TRPC_ERROR_CODES.includes(code as TRPC_ERROR_CODE_KEY);
}

/**
 * Centralized error handler for external API errors
 * Always wraps errors in TRPCError and never leaks raw errors to client
 */

export function handleApiError(error: ApiError | Error | unknown): never {
  if (error instanceof ApiError) {
    throw mapApiErrorToTRPC(error);
  }

  if (error instanceof Error) {
    const code = isTRPCErrorCode(error.cause) ? error.cause : 'INTERNAL_SERVER_ERROR';
    throw new TRPCError({ code, message: error.message });
  }

  throw new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: error instanceof Error ? error.message : 'Unknown error',
  });
}
