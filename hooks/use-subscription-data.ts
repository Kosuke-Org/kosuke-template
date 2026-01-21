'use client';

import { trpc } from '@/lib/trpc/client';

import { useAuth } from './use-auth';

/**
 * Check if Stripe API key is configured
 */
export function useStripeConfigured() {
  return trpc.billing.isConfigured.useQuery(undefined, {
    refetchOnMount: 'always',
  });
}

/**
 * Get user's subscription status
 */
export function useSubscriptionStatus() {
  const { activeOrganizationId } = useAuth();

  return trpc.billing.getStatus.useQuery(
    { organizationId: activeOrganizationId! },
    {
      enabled: !!activeOrganizationId,
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: true, // Refetch when user returns from Stripe popup
    }
  );
}

/**
 * Check if user can subscribe or perform subscription actions
 */
export function useCanSubscribe() {
  const { activeOrganizationId } = useAuth();

  return trpc.billing.canSubscribe.useQuery(
    { organizationId: activeOrganizationId! },
    {
      enabled: !!activeOrganizationId,
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: true, // Refetch when user returns from Stripe popup
    }
  );
}

/**
 * Get pricing data
 */
export const usePricingData = () => {
  const { activeOrganizationId } = useAuth();

  return trpc.billing.getPricing.useQuery(
    { organizationId: activeOrganizationId! },
    {
      enabled: !!activeOrganizationId,
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: true, // Refetch when user returns from Stripe popup
    }
  );
};
