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
