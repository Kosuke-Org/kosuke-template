import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines multiple class names into a single string, with Tailwind CSS optimizations
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
