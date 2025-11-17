/**
 * Order utilities
 * Shared constants and helper functions for orders feature
 */
import type { OrderStatus } from '@/lib/types';

export const statusOptions: { value: OrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  shipped: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  delivered: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

export const MAX_AMOUNT = 10000;
