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

/** Working days a parcel spends with the carrier once it has shipped. */
const TRANSIT_DAYS = 3;

/** Working days an order still needs to leave the warehouse, by status. */
const LEAD_DAYS: Partial<Record<OrderStatus, number>> = {
  pending: 2,
  processing: 1,
  shipped: 0,
};

/**
 * The window an order should arrive in, or null once it is delivered or
 * cancelled. Orders that have not shipped add the days they still need to
 * leave the warehouse.
 */
export function deliveryWindow(status: OrderStatus, orderDate: Date): [Date, Date] | null {
  if (status === 'delivered' || status === 'cancelled') return null;
  const from = addWorkingDays(orderDate, (LEAD_DAYS[status] ?? 0) + TRANSIT_DAYS);
  return [from, addWorkingDays(from, 2)];
}

function addWorkingDays(date: Date, days: number): Date {
  const out = new Date(date);
  for (let left = days; left > 0; ) {
    out.setDate(out.getDate() + 1);
    if (out.getDay() !== 0 && out.getDay() !== 6) left -= 1;
  }
  return out;
}
