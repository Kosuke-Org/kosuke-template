/**
 * Order History Timeline
 * Visual timeline showing status progression with timestamps
 */

'use client';

import { format } from 'date-fns';
import { Check } from 'lucide-react';

import type { OrderStatus } from '@/lib/db/schema';
import type { OrderHistoryOutput } from '@/lib/types/order';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

import { statusColors } from '../../utils';

// Define the standard order status progression
const statusProgression: OrderStatus[] = [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export function OrderHistoryTimeline({
  history,
  currentStatus,
}: {
  history: OrderHistoryOutput;
  currentStatus: OrderStatus;
}) {
  const historyMap = new Map<OrderStatus, OrderHistoryOutput[number]>();
  history.forEach((entry) => {
    // Use the first occurrence of each status
    if (!historyMap.has(entry.status)) {
      historyMap.set(entry.status, entry);
    }
  });

  // Get current status index
  const currentStatusIndex = statusProgression.indexOf(currentStatus);
  const isCancelled = currentStatus === 'cancelled';

  // Filter statuses based on order state
  // For cancelled orders: only show pending and cancelled
  // For non-cancelled orders: show all statuses except cancelled
  const visibleStatuses = statusProgression.filter((status) => {
    if (isCancelled) {
      return status === 'pending' || status === 'cancelled' || status === 'processing';
    }
    return status !== 'cancelled';
  });

  return (
    <>
      {/* Horizontal Timeline - Desktop */}
      <div className="hidden md:block">
        <div className="relative">
          {/* Timeline items */}
          <div
            className="relative grid gap-4"
            style={{ gridTemplateColumns: `repeat(${visibleStatuses.length}, 1fr)` }}
          >
            {/* Connecting line behind dots - positioned to span from first to last dot */}
            {visibleStatuses.length > 1 && (
              <div className="absolute top-4 right-0 left-0 flex items-center justify-center">
                <Separator
                  className="absolute"
                  style={{
                    width: `calc(100% - ${100 / visibleStatuses.length}%)`,
                    left: `${50 / visibleStatuses.length}%`,
                  }}
                />
              </div>
            )}
            {visibleStatuses.map((status, index) => {
              const entry = historyMap.get(status);
              const isCompleted = isCancelled
                ? status === 'pending' || status === 'cancelled'
                : entry !== undefined || index < currentStatusIndex;
              const isCurrent = status === currentStatus;
              const isDisabled = !isCompleted && !isCurrent;

              return (
                <div key={status} className="relative flex flex-col items-center gap-4">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'bg-background z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all',
                      isCompleted && 'border-primary bg-primary',
                      isCurrent && 'bg-background border-0',
                      isDisabled && 'border-muted bg-background border-dashed'
                    )}
                  >
                    {isCompleted && !isCurrent && (
                      <Check className="text-primary-foreground h-4 w-4" />
                    )}

                    {isCurrent && <div className="bg-primary h-3 w-3 rounded-full" />}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-center gap-4">
                    <Badge
                      className={cn(
                        statusColors[status],
                        isDisabled && 'rounded-full opacity-50 hover:bg-inherit'
                      )}
                    >
                      {status}
                    </Badge>
                    {entry && (
                      <div className="space-y-1 text-center">
                        <div className="text-muted-foreground text-xs">
                          {format(entry.createdAt, 'PP')}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {format(entry.createdAt, 'p')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Vertical Timeline - Mobile */}
      <div className="md:hidden">
        <div className="space-y-0">
          {visibleStatuses.map((status, index) => {
            const entry = historyMap.get(status);
            const isCompleted = isCancelled
              ? status === 'pending' || status === 'cancelled'
              : entry !== undefined || index < currentStatusIndex;
            const isCurrent = status === currentStatus;
            const isDisabled = !isCompleted && !isCurrent;

            return (
              <div key={status} className="relative flex gap-4 pb-8 last:pb-0">
                {/* Timeline connector */}
                <Separator orientation="vertical" className="absolute left-3" />
                <div className="relative flex flex-col items-center">
                  {/* Timeline dot */}
                  <div
                    className={cn(
                      'bg-background z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all',
                      isCompleted && 'border-primary bg-primary',
                      isCurrent && 'bg-background border-0',
                      isDisabled && 'border-muted bg-background border-dashed'
                    )}
                  >
                    {isCompleted && !isCurrent && (
                      <Check className="text-primary-foreground h-4 w-4" />
                    )}
                    {isCurrent && <div className="bg-primary h-3 w-3 rounded-full" />}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <Badge className={cn(statusColors[status], isDisabled && 'opacity-50')}>
                      {status}
                    </Badge>
                    {isCurrent && <span className="text-muted-foreground text-xs">Current</span>}
                  </div>

                  {entry && (
                    <div className="mt-2 space-y-1">
                      <div className="text-muted-foreground text-sm">
                        {format(entry.createdAt, 'PPP')} at {format(entry.createdAt, 'p')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
