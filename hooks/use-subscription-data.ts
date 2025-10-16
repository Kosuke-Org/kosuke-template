'use client';

import { trpc } from '@/lib/trpc/client';

/**
 * Get user's subscription status
 */
export function useSubscriptionStatus() {
  return trpc.billing.getStatus.useQuery(undefined, {
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Check if user can subscribe or perform subscription actions
 */
export function useCanSubscribe() {
  return trpc.billing.canSubscribe.useQuery(undefined, {
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
