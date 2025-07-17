'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface UpgradeResponse {
  success: boolean;
  checkoutUrl?: string;
  error?: string;
}

export function useSubscriptionActions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  const upgradeMutation = useMutation({
    mutationFn: async ({
      tier,
      isUpgrade,
    }: {
      tier: string;
      isUpgrade: boolean;
    }): Promise<UpgradeResponse> => {
      const endpoint = isUpgrade
        ? '/api/billing/upgrade-subscription'
        : '/api/billing/create-checkout';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error('Failed to process upgrade request');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      if (data.success && data.checkoutUrl) {
        if (variables.isUpgrade) {
          toast({
            title: 'Upgrade Initiated',
            description: `Your subscription has been updated and you'll be redirected to complete your ${variables.tier} upgrade.`,
            variant: 'default',
          });
        }
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
      console.error('Upgrade error:', error);
      toast({
        title: 'Error',
        description: 'Failed to process upgrade. Please try again.',
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
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-eligibility'] });

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
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-eligibility'] });

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

  const handleUpgrade = async (tier: string, currentTier: string, subscriptionStatus?: string) => {
    setUpgradeLoading(tier);
    const isUpgrade = currentTier !== 'free' && subscriptionStatus === 'active';
    upgradeMutation.mutate({ tier, isUpgrade });
  };

  const handleCancel = async () => {
    cancelMutation.mutate();
  };

  const handleReactivate = async () => {
    reactivateMutation.mutate();
  };

  return {
    handleUpgrade,
    handleCancel,
    handleReactivate,
    isUpgrading: upgradeMutation.isPending,
    isCanceling: cancelMutation.isPending,
    isReactivating: reactivateMutation.isPending,
    upgradeLoading,
  };
}
