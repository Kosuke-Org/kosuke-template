'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useIframeMessageHandlerStore } from '@/store/use-iframe-message-handler';

import { SubscriptionTierType } from '@/lib/billing';
import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

/**
 * Subscription management actions (create, cancel, reactivate)
 */
export function useSubscriptionActions() {
  const { toast } = useToast();
  const router = useRouter();
  const utils = trpc.useUtils();
  const parentUrl = useIframeMessageHandlerStore((state) => state.parentUrl);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);

  const createCheckout = trpc.billing.createCheckout.useMutation({
    onSuccess: (data) => {
      const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

      if (isEmbedded) {
        // Open Stripe checkout in a new window when embedded in iframe
        window.open(data.checkoutUrl, '_blank', 'noreferrer,noopener');
      } else {
        // When not embedded, navigate directly
        window.location.href = data.checkoutUrl;
      }
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

    // Detect if we're embedded in an iframe
    // When standalone, don't pass URL so server uses env variable
    const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;
    let redirectUrl: string | undefined;

    console.log('[iframe] isEmbedded:', isEmbedded);
    console.log('[iframe] Parent URL:', parentUrl);

    if (isEmbedded && parentUrl) {
      redirectUrl = parentUrl;
    }

    console.log('redirectUrl', redirectUrl);

    createCheckout.mutate({
      tier: tier as SubscriptionTierType,
      redirectUrl,
    });
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
