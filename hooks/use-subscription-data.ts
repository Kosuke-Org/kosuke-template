'use client';

import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { UserSubscription } from '@/lib/db/schema';

interface SubscriptionInfo {
  tier: string;
  status: string;
  currentPeriodEnd?: string;
  activeSubscription?: UserSubscription | null;
  user?: {
    localId: string;
    clerkUserId: string;
  };
}

interface SubscriptionEligibility {
  canReactivate: boolean;
  canCreateNew: boolean;
  canUpgrade: boolean;
  canCancel: boolean;
  state: string;
  gracePeriodEnds?: string;
  reason?: string;
}

export function useSubscriptionData() {
  const { toast } = useToast();

  const subscriptionQuery = useQuery({
    queryKey: ['subscription-status'],
    queryFn: async (): Promise<SubscriptionInfo> => {
      const response = await fetch('/api/billing/subscription-status');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription info');
      }
      return response.json();
    },
    retry: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const eligibilityQuery = useQuery({
    queryKey: ['subscription-eligibility'],
    queryFn: async (): Promise<SubscriptionEligibility> => {
      const response = await fetch('/api/billing/can-subscribe');
      if (!response.ok) {
        throw new Error('Failed to fetch subscription eligibility');
      }
      const data = await response.json();
      return {
        canReactivate:
          data.currentSubscription?.isInGracePeriod &&
          data.currentSubscription?.status === 'canceled',
        canCreateNew: data.canSubscribe,
        canUpgrade: data.canSubscribe,
        canCancel: data.currentSubscription?.status === 'active',
        state: data.currentSubscription?.status || 'free',
        gracePeriodEnds: data.currentSubscription?.currentPeriodEnd,
        reason: data.reason,
      };
    },
    retry: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const refetchSubscriptionInfo = async () => {
    try {
      await Promise.all([subscriptionQuery.refetch(), eligibilityQuery.refetch()]);
    } catch (error) {
      console.error('Error refetching subscription info:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh subscription information. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return {
    subscriptionInfo: subscriptionQuery.data,
    eligibility: eligibilityQuery.data,
    isLoading: subscriptionQuery.isLoading || eligibilityQuery.isLoading,
    error: subscriptionQuery.error || eligibilityQuery.error,
    refetchSubscriptionInfo,
  };
}
