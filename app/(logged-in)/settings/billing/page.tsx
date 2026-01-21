'use client';

import { Calendar, CheckCircle, CreditCard, Loader2, RotateCcw, XCircle } from 'lucide-react';

import { SubscriptionTier } from '@/lib/db/schema';
import { trpc } from '@/lib/trpc/client';
import { ORG_ROLES } from '@/lib/types/organization';

import { useOrganization } from '@/hooks/use-organization';
import { useSubscriptionActions } from '@/hooks/use-subscription-actions';
import {
  useCanSubscribe,
  usePricingData,
  useStripeConfigured,
  useSubscriptionStatus,
} from '@/hooks/use-subscription-data';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';

import { ErrorMessage } from '@/components/error-message';
import { BadgeSkeleton, ButtonSkeleton } from '@/components/skeletons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Page-specific skeleton for billing page
function BillingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="mb-2 h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Current Plan Card */}
      <div className="space-y-4 rounded-lg border p-6">
        <div className="mb-4 flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="mb-2 h-4 w-32" />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="space-y-1 text-right">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <BadgeSkeleton />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <Skeleton className="bg-border h-px w-full" />

        {/* Features skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>

        <Skeleton className="bg-border h-px w-full" />

        {/* Action buttons skeleton */}
        <div className="flex gap-2">
          <ButtonSkeleton className="h-8" />
          <ButtonSkeleton className="h-8" />
        </div>
      </div>

      {/* Choose Your Plan */}
      <div className="space-y-4 rounded-lg border p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="relative space-y-4 rounded-lg border p-6">
              {i === 0 && <BadgeSkeleton className="absolute top-4 right-4" />}
              <div className="space-y-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
              <ButtonSkeleton className="w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Billing Information */}
      <div className="space-y-4 rounded-lg border p-6">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { user } = useUser();
  const { toast } = useToast();
  const { currentUserRole } = useOrganization();
  const { data: stripeConfig, isLoading: isLoadingConfig } = useStripeConfigured();
  const { data: subscriptionInfo, isLoading: isLoadingStatus } = useSubscriptionStatus();
  const { data: eligibility, isLoading: isLoadingEligibility } = useCanSubscribe();
  const { data: pricingData, isLoading: isLoadingPricing } = usePricingData();
  const isLoading = isLoadingConfig || isLoadingStatus || isLoadingEligibility || isLoadingPricing;

  // Check if user is owner (can manage billing)
  const isOwner = currentUserRole === ORG_ROLES.OWNER;
  const {
    handleUpgrade,
    handleCancel,
    handleReactivate,
    handleCancelDowngrade,
    isCanceling,
    isReactivating,
    isCancelingDowngrade,
    upgradeLoading,
  } = useSubscriptionActions();

  const createPortalSession = trpc.billing.createPortalSession.useMutation({
    onSuccess: (data) => {
      const isEmbedded = typeof window !== 'undefined' && window.self !== window.top;

      if (isEmbedded) {
        window.open(data.url, '_blank', 'noreferrer,noopener');
      } else {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { variant: 'default' as const, color: 'bg-green-500' },
      canceled: { variant: 'destructive' as const, color: 'bg-red-500' },
      past_due: { variant: 'destructive' as const, color: 'bg-yellow-500' },
      unpaid: { variant: 'destructive' as const, color: 'bg-red-500' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: 'outline' as const,
    };
    return (
      <Badge variant={config.variant} className="capitalize">
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return <BillingSkeleton />;
  }

  // Handle case when Stripe is not configured
  if (!stripeConfig?.isConfigured) {
    return (
      <div className="py-6">
        <ErrorMessage
          title="Stripe API Key Not Configured"
          description="Billing features are not available. Please configure your STRIPE_SECRET_KEY environment variable to enable subscription management."
        />
      </div>
    );
  }

  // Handle case when pricing data couldn't be loaded
  if (!pricingData || Object.keys(pricingData).length === 0) {
    return (
      <div className="py-6">
        <ErrorMessage
          title="Stripe billing is not configured"
          description="Please contact support to configure your billing."
        />
      </div>
    );
  }

  const currentTier = subscriptionInfo?.tier || SubscriptionTier.FREE_MONTHLY;
  const currentPlan = pricingData[currentTier];
  const isPaidPlan =
    currentTier !== SubscriptionTier.FREE_MONTHLY && subscriptionInfo?.activeSubscription;
  const canCancelSubscription = eligibility?.canCancel;
  const canReactivateSubscription = eligibility?.canReactivate;

  // Check if subscription is marked for cancellation and still in grace period
  const isCanceled = subscriptionInfo?.activeSubscription?.cancelAtPeriodEnd === 'true';
  const hasExpired =
    subscriptionInfo?.currentPeriodEnd && new Date() >= new Date(subscriptionInfo.currentPeriodEnd);
  const isInGracePeriod =
    isCanceled &&
    subscriptionInfo?.currentPeriodEnd &&
    new Date() < new Date(subscriptionInfo.currentPeriodEnd);

  // Check if we should show action buttons (hide when there's a scheduled downgrade)
  const hasScheduledDowngrade = !!subscriptionInfo?.activeSubscription?.scheduledDowngradeTier;
  const showReactivateButton =
    canReactivateSubscription && isInGracePeriod && !hasScheduledDowngrade;
  const showCancelButton = canCancelSubscription && !hasScheduledDowngrade;
  const showActionButtons = showReactivateButton || showCancelButton;

  const onUpgrade = (tier: string) => {
    handleUpgrade(tier);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">Billing & Subscription</h2>
        <p className="text-muted-foreground text-sm">
          Manage your subscription and billing information.
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>Your current subscription details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{String(currentPlan.name)}</h3>
              <p className="text-muted-foreground text-sm">{String(currentPlan.description)}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${currentPlan.price}</div>
              <div className="text-muted-foreground text-sm">per month</div>
            </div>
          </div>

          {subscriptionInfo?.status && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(subscriptionInfo.status)}
              </div>
              {subscriptionInfo.currentPeriodEnd && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {hasExpired
                      ? `Expired on ${formatDate(subscriptionInfo.currentPeriodEnd)}`
                      : isCanceled
                        ? `Expires on ${formatDate(subscriptionInfo.currentPeriodEnd)}`
                        : `Renews on ${formatDate(subscriptionInfo.currentPeriodEnd)}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pending Downgrade Alert */}
          {subscriptionInfo?.activeSubscription?.scheduledDowngradeTier && (
            <div className="rounded-lg border border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div>
                    <h4 className="flex items-center gap-2 font-medium">
                      <Calendar className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-yellow-800 dark:text-yellow-200">
                        Scheduled Downgrade
                      </span>
                    </h4>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                      Your subscription will downgrade to{' '}
                      <strong>
                        {pricingData[subscriptionInfo.activeSubscription.scheduledDowngradeTier]
                          ?.name || subscriptionInfo.activeSubscription.scheduledDowngradeTier}
                      </strong>{' '}
                      on {formatDate(subscriptionInfo.currentPeriodEnd)}. You&apos;ll keep{' '}
                      {currentPlan.name} features until then.
                    </p>
                  </div>
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          onClick={handleCancelDowngrade}
                          disabled={isCancelingDowngrade || !isOwner}
                          variant="outline"
                          size="sm"
                          className="shrink-0 border-yellow-600 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-200 dark:hover:bg-yellow-900"
                        >
                          {isCancelingDowngrade ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Canceling...
                            </>
                          ) : (
                            <>
                              <XCircle className="mr-2 h-3 w-3" />
                              Cancel Downgrade
                            </>
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!isOwner && (
                      <TooltipContent>
                        <p>Only organization owners can manage billing</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="mb-2 font-medium">Features included:</h4>
            <ul className="space-y-1">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {feature.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Subscription Actions */}
          {isPaidPlan && showActionButtons && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {/* Reactivate Button - Show for canceled subscriptions in grace period (but NOT if there's a scheduled downgrade) */}
                {showReactivateButton && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            onClick={handleReactivate}
                            disabled={isReactivating || !isOwner}
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {isReactivating ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Reactivating...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="mr-2 h-3 w-3" />
                                Reactivate
                              </>
                            )}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isOwner && (
                        <TooltipContent>
                          <p>Only organization owners can manage billing</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Cancel Button - Show for active paid plans (but NOT if there's a scheduled downgrade) */}
                {showCancelButton && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isCanceling || !isOwner}
                              >
                                {isCanceling ? (
                                  <>
                                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                    Cancelling...
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="mr-2 h-3 w-3" />
                                    Cancel Subscription
                                  </>
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancel subscription?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  You&apos;ll continue to have access until{' '}
                                  {formatDate(subscriptionInfo?.currentPeriodEnd)}, then be
                                  downgraded to the free plan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleCancel}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Cancel Subscription
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </span>
                      </TooltipTrigger>
                      {!isOwner && (
                        <TooltipContent>
                          <p>Only organization owners can manage billing</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Choose Your Plan */}
      {Object.entries(pricingData).filter(([tier]) => tier !== currentTier).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Plan</CardTitle>
            <CardDescription>
              Select a plan to unlock more features and capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(pricingData)
                .filter(([tier]) => tier !== currentTier)
                .map(([tier, plan]) => {
                  const isCurrentPlan = tier === currentTier;
                  const scheduledTier =
                    subscriptionInfo?.activeSubscription?.scheduledDowngradeTier;
                  const isScheduledDowngrade = scheduledTier === tier;
                  const canUpgradeToThisPlan =
                    !isInGracePeriod &&
                    !scheduledTier &&
                    (eligibility?.canUpgrade || eligibility?.canCreateNew);
                  const isUpgrade = plan.price > currentPlan.price;
                  return (
                    <Card
                      key={tier}
                      className={`relative flex flex-col ${isCurrentPlan ? 'border-primary bg-primary/5' : ''}`}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {plan.name}
                          {tier === 'pro' && !isCurrentPlan && !isScheduledDowngrade && (
                            <Badge variant="secondary">Most Popular</Badge>
                          )}
                          {isCurrentPlan && <Badge>Current Plan</Badge>}
                          {isScheduledDowngrade && (
                            <Badge
                              variant="outline"
                              className="border-yellow-500 text-yellow-700 dark:text-yellow-400"
                            >
                              Scheduled
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col space-y-4">
                        <div className="text-3xl font-bold">${plan.price}</div>
                        <div className="text-muted-foreground text-sm">per month</div>

                        <ul className="flex-1 space-y-2">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              {feature.name}
                            </li>
                          ))}
                        </ul>

                        {!isCurrentPlan && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="w-full">
                                  <Button
                                    onClick={() => onUpgrade(tier)}
                                    disabled={
                                      !canUpgradeToThisPlan ||
                                      upgradeLoading === tier ||
                                      isScheduledDowngrade ||
                                      !isOwner
                                    }
                                    className="mt-auto w-full"
                                  >
                                    {isScheduledDowngrade ? (
                                      <>
                                        Scheduled for{' '}
                                        {formatDate(subscriptionInfo?.currentPeriodEnd)}
                                      </>
                                    ) : upgradeLoading === tier ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                      </>
                                    ) : currentTier === SubscriptionTier.FREE_MONTHLY ? (
                                      `Subscribe to ${plan.name}`
                                    ) : isUpgrade ? (
                                      `Upgrade to ${plan.name}`
                                    ) : (
                                      `Downgrade to ${plan.name}`
                                    )}
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              {!isOwner && (
                                <TooltipContent>
                                  <p>Only organization owners can manage billing</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No more billing plans</CardTitle>
            <CardDescription> Manage Billing in your Stripe account.</CardDescription>
          </CardHeader>
        </Card>
      )}
      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>Your billing details and payment history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPaidPlan ? (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={() => createPortalSession.mutate()}
                        disabled={createPortalSession.isPending || !isOwner}
                        variant="outline"
                        className="w-full sm:w-auto"
                      >
                        {createPortalSession.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Manage Billing in Stripe
                          </>
                        )}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!isOwner && (
                    <TooltipContent>
                      <p>Only organization owners can manage billing</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              You&apos;re currently on the free plan. Upgrade to a paid plan to access advanced
              features and premium support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
