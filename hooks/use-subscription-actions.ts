'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useQueryClient } from '@tanstack/react-query';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

/**
 * Subscription management actions (create, cancel, reactivate)
 */
export function useSubscriptionActions() {
  const { toast } = useToast();
  const router = useRouter();
  const utils = trpc.useContext();
  const queryClient = useQueryClient();
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.checkoutUrl;
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setUpgradeLoading(null);
    },
  });

  const cancel = trpc.billing.cancel.useMutation({
    onSuccess: (data) => {
      utils.billing.getStatus.invalidate();
      utils.billing.canSubscribe.invalidate();
      // Also invalidate legacy query keys for backward compatibility
      queryClient.refetchQueries({ queryKey: ['subscription-status'] });
      queryClient.refetchQueries({ queryKey: ['subscription-eligibility'] });
      toast({
        title: 'Subscription Canceled',
        description: data.message,
      });
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const reactivate = trpc.billing.reactivate.useMutation({
    onSuccess: (data) => {
      utils.billing.getStatus.invalidate();
      utils.billing.canSubscribe.invalidate();
      // Also invalidate legacy query keys for backward compatibility
      queryClient.refetchQueries({ queryKey: ['subscription-status'] });
      queryClient.refetchQueries({ queryKey: ['subscription-eligibility'] });
      toast({
        title: 'Subscription Reactivated',
        description: data.message,
      });
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const cancelDowngrade = trpc.billing.cancelDowngrade.useMutation({
    onSuccess: (data) => {
      utils.billing.getStatus.invalidate();
      utils.billing.canSubscribe.invalidate();
      // Also invalidate legacy query keys for backward compatibility
      queryClient.refetchQueries({ queryKey: ['subscription-status'] });
      queryClient.refetchQueries({ queryKey: ['subscription-eligibility'] });
      toast({
        title: 'Downgrade Canceled',
        description: data.message,
      });
      router.refresh();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleUpgrade = async (tier: string) => {
    setUpgradeLoading(tier);
    createCheckout.mutate({ tier: tier as 'pro' | 'business' });
  };

  const handleCancel = async () => {
    cancel.mutate();
  };

  const handleReactivate = async () => {
    reactivate.mutate();
  };

  const handleCancelDowngrade = async () => {
    cancelDowngrade.mutate();
  };

  return {
    handleUpgrade,
    handleCancel,
    handleReactivate,
    handleCancelDowngrade,
    isUpgrading: createCheckout.isPending,
    isCanceling: cancel.isPending,
    isReactivating: reactivate.isPending,
    isCancelingDowngrade: cancelDowngrade.isPending,
    upgradeLoading,
  };
}
