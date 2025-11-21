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
  pending:
    'bg-chart-5/10 text-chart-5 border-chart-5/20 dark:bg-chart-1/10 dark:text-chart-1 dark:border-chart-1/20',
  processing: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  shipped: 'bg-chart-3/10 text-chart-3 border-chart-3/20',
  delivered: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  cancelled:
    'bg-chart-1/10 text-chart-1 border-chart-1/20 dark:bg-chart-5/10 dark:text-chart-5 dark:border-chart-5/20 ',
};

export const MAX_AMOUNT = 10000;
