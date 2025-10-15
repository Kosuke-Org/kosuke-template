'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { UpgradeResponse } from '@/lib/types';

export function useSubscriptionActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  const checkoutMutation = useMutation({
    mutationFn: async ({ tier }: { tier: string }): Promise<UpgradeResponse> => {
      // Stripe Checkout handles both new subscriptions and upgrades
      const response = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to process request',
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      console.error('Checkout error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create checkout session. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setUpgradeLoading(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (): Promise<{ success: boolean; message?: string }> => {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Force immediate refetch to update UI
      queryClient.refetchQueries({ queryKey: ['subscription-status'] });
      queryClient.refetchQueries({ queryKey: ['subscription-eligibility'] });

      toast({
        title: 'Subscription Canceled',
        description: data.message || 'Your subscription has been canceled successfully.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Cancel error:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel subscription. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (): Promise<{ success: boolean; message?: string }> => {
      const response = await fetch('/api/billing/reactivate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Force immediate refetch to update UI
      queryClient.refetchQueries({ queryKey: ['subscription-status'] });
      queryClient.refetchQueries({ queryKey: ['subscription-eligibility'] });

      toast({
        title: 'Subscription Reactivated',
        description: data.message || 'Your subscription has been reactivated successfully.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Reactivate error:', error);
      toast({
        title: 'Error',
        description: 'Failed to reactivate subscription. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const cancelDowngradeMutation = useMutation({
    mutationFn: async (): Promise<{ success: boolean; message?: string }> => {
      const response = await fetch('/api/billing/cancel-downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel pending downgrade');
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Force immediate refetch to update UI
      queryClient.refetchQueries({ queryKey: ['subscription-status'] });
      queryClient.refetchQueries({ queryKey: ['subscription-eligibility'] });

      toast({
        title: 'Downgrade Canceled',
        description: data.message || 'Your pending downgrade has been canceled.',
        variant: 'default',
      });
    },
    onError: (error) => {
      console.error('Cancel downgrade error:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel pending downgrade. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleUpgrade = async (tier: string) => {
    setUpgradeLoading(tier);
    checkoutMutation.mutate({ tier });
  };

  const handleCancel = async () => {
    cancelMutation.mutate();
  };

  const handleReactivate = async () => {
    reactivateMutation.mutate();
  };

  const handleCancelDowngrade = async () => {
    cancelDowngradeMutation.mutate();
  };

  return {
    handleUpgrade,
    handleCancel,
    handleReactivate,
    handleCancelDowngrade,
    isUpgrading: checkoutMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isReactivating: reactivateMutation.isPending,
    isCancelingDowngrade: cancelDowngradeMutation.isPending,
    upgradeLoading,
  };
}
