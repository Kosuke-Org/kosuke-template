'use client';

import { CheckCircle, Loader2, CreditCard, Calendar, XCircle, RotateCcw } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BadgeSkeleton, ButtonSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useSubscriptionData } from '@/hooks/use-subscription-data';
import { useSubscriptionActions } from '@/hooks/use-subscription-actions';

// Page-specific skeleton for billing page
function BillingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Current Plan Card */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-32 mb-2" />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="text-right space-y-1">
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

        <Skeleton className="h-px w-full bg-border" />

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

        <Skeleton className="h-px w-full bg-border" />

        {/* Action buttons skeleton */}
        <div className="flex gap-2">
          <ButtonSkeleton className="h-8" />
          <ButtonSkeleton className="h-8" />
        </div>
      </div>

      {/* Choose Your Plan */}
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="relative rounded-lg border p-6 space-y-4">
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
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

const PRICING = {
  free: {
    price: 0,
    name: 'Free',
    description: 'Perfect for getting started',
    features: ['Basic features', 'Community support', 'Limited usage'],
  },
  pro: {
    price: 20,
    name: 'Pro',
    description: 'For growing teams',
    features: ['All free features', 'Priority support', 'Advanced features', 'Higher usage limits'],
  },
  business: {
    price: 200,
    name: 'Business',
    description: 'For large organizations',
    features: ['All pro features', 'Enterprise support', 'Custom integrations', 'Unlimited usage'],
  },
} as const;

export default function BillingPage() {
  const { user, isSignedIn } = useUser();
  const { subscriptionInfo, eligibility, isLoading } = useSubscriptionData();
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

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
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

  if (!isSignedIn || !user) {
    return null;
  }

  if (isLoading) {
    return <BillingSkeleton />;
  }

  const currentTier = subscriptionInfo?.tier || 'free';
  const currentPlan = PRICING[currentTier as keyof typeof PRICING] || PRICING.free;
  const isPaidPlan = currentTier !== 'free' && subscriptionInfo?.activeSubscription;
  const canCancelSubscription = eligibility?.canCancel;
  const canReactivateSubscription = eligibility?.canReactivate;

  // Check if subscription is marked for cancellation and still in grace period
  const isCanceled = subscriptionInfo?.activeSubscription?.cancelAtPeriodEnd === 'true';
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
        <p className="text-sm text-muted-foreground">
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
              <h3 className="font-semibold text-lg">{String(currentPlan.name)}</h3>
              <p className="text-sm text-muted-foreground">{String(currentPlan.description)}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${currentPlan.price}</div>
              <div className="text-sm text-muted-foreground">per month</div>
            </div>
          </div>

          {subscriptionInfo?.status && (
            <div className="flex items-center flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(subscriptionInfo.status)}
              </div>
              {subscriptionInfo.currentPeriodEnd && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {isCanceled
                      ? `Expires on ${formatDate(subscriptionInfo.currentPeriodEnd)}`
                      : `Renews on ${formatDate(subscriptionInfo.currentPeriodEnd)}`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Pending Downgrade Alert */}
          {subscriptionInfo?.activeSubscription?.scheduledDowngradeTier && (
            <div className="rounded-lg border border-yellow-500 bg-yellow-50 dark:bg-yellow-950 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 text-yellow-600 dark:text-yellow-400">⏱️</div>
                  <div>
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Scheduled Downgrade
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Your subscription will downgrade to{' '}
                      <strong>
                        {PRICING[
                          subscriptionInfo.activeSubscription
                            .scheduledDowngradeTier as keyof typeof PRICING
                        ]?.name || subscriptionInfo.activeSubscription.scheduledDowngradeTier}
                      </strong>{' '}
                      on {formatDate(subscriptionInfo.currentPeriodEnd)}. You&apos;ll keep{' '}
                      {currentPlan.name} features until then.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleCancelDowngrade}
                  disabled={isCancelingDowngrade}
                  variant="outline"
                  size="sm"
                  className="border-yellow-600 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-500 dark:text-yellow-200 dark:hover:bg-yellow-900 shrink-0"
                >
                  {isCancelingDowngrade ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3 w-3 mr-2" />
                      Cancel Downgrade
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <h4 className="font-medium mb-2">Features included:</h4>
            <ul className="space-y-1">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {feature}
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
                  <Button
                    onClick={handleReactivate}
                    disabled={isReactivating}
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isReactivating ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        Reactivating...
                      </>
                    ) : (
                      <>
                        <RotateCcw className="h-3 w-3 mr-2" />
                        Reactivate
                      </>
                    )}
                  </Button>
                )}

                {/* Cancel Button - Show for active paid plans (but NOT if there's a scheduled downgrade) */}
                {showCancelButton && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isCanceling}>
                        {isCanceling ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                            Cancelling...
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-2" />
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
                          {formatDate(subscriptionInfo?.currentPeriodEnd)}, then be downgraded to
                          the free plan.
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
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Choose Your Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Choose Your Plan</CardTitle>
          <CardDescription>Select a plan to unlock more features and capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(PRICING).map(([tier, plan]) => {
              if (tier === 'free') return null;

              const isCurrentPlan = tier === currentTier;
              const scheduledTier = subscriptionInfo?.activeSubscription?.scheduledDowngradeTier;
              const isScheduledDowngrade = scheduledTier === tier;

              // If in grace period or there's a scheduled downgrade, cannot change plans
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
                  <CardContent className="space-y-4 flex-1 flex flex-col">
                    <div className="text-3xl font-bold">${plan.price}</div>
                    <div className="text-sm text-muted-foreground">per month</div>

                    <ul className="space-y-2 flex-1">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {!isCurrentPlan && (
                      <Button
                        onClick={() => onUpgrade(tier)}
                        disabled={
                          !canUpgradeToThisPlan || upgradeLoading === tier || isScheduledDowngrade
                        }
                        className="w-full mt-auto"
                      >
                        {isScheduledDowngrade ? (
                          <>Scheduled for {formatDate(subscriptionInfo?.currentPeriodEnd)}</>
                        ) : upgradeLoading === tier ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : currentTier === 'free' ? (
                          `Subscribe to ${plan.name}`
                        ) : isUpgrade ? (
                          `Upgrade to ${plan.name}`
                        ) : (
                          `Downgrade to ${plan.name}`
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>Your billing details and payment history</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPaidPlan ? (
            <>
              <Button
                onClick={async () => {
                  const response = await fetch('/api/billing/customer-portal', {
                    method: 'POST',
                  });
                  const data = await response.json();
                  if (data.url) {
                    window.location.href = data.url;
                  }
                }}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Manage Billing in Stripe
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You&apos;re currently on the free plan. Upgrade to a paid plan to access advanced
              features and premium support.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
