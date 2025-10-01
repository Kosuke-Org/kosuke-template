'use client';

import {
  CheckCircle,
  Loader2,
  CreditCard,
  Calendar,
  AlertCircle,
  XCircle,
  RotateCcw,
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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

        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Cancel Subscription Card (conditional) */}
      <div className="rounded-lg border border-destructive/20 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-4 w-64" />

        <div className="rounded-md bg-destructive/10 p-4 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>

        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        <ButtonSkeleton className="bg-destructive" />
      </div>

      {/* Upgrade Options */}
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
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />

        <div className="rounded-md bg-muted p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
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
    isCanceling,
    isReactivating,
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

  const formatDateWithTime = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
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
  const isInGracePeriod =
    subscriptionInfo?.status === 'canceled' &&
    subscriptionInfo?.currentPeriodEnd &&
    new Date() < new Date(subscriptionInfo.currentPeriodEnd);

  const onUpgrade = (tier: string) => {
    handleUpgrade(tier, currentTier, subscriptionInfo?.status);
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
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                {getStatusBadge(subscriptionInfo.status)}
              </div>
              {subscriptionInfo.currentPeriodEnd && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">
                    {subscriptionInfo.status === 'canceled'
                      ? `Access until ${formatDate(subscriptionInfo.currentPeriodEnd)}`
                      : `Renews on ${formatDate(subscriptionInfo.currentPeriodEnd)}`}
                  </span>
                </div>
              )}
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
        </CardContent>
      </Card>

      {/* Reactivation Option - Show for canceled subscriptions in grace period */}
      {canReactivateSubscription && isInGracePeriod && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <RotateCcw className="h-5 w-5" />
              Reactivate Your Subscription
            </CardTitle>
            <CardDescription>
              You can reactivate your {String(currentPlan.name)} subscription at no additional cost
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your subscription was canceled but you still have access until{' '}
                <strong>{formatDateWithTime(subscriptionInfo?.currentPeriodEnd)}</strong>. You can
                reactivate it for free anytime before this date expires.
              </AlertDescription>
            </Alert>

            <div className="pt-2">
              <Button
                onClick={handleReactivate}
                disabled={isReactivating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isReactivating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Reactivating...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reactivate Subscription
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Subscription - Show for active paid plans */}
      {isPaidPlan && canCancelSubscription && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Cancel Subscription
            </CardTitle>
            <CardDescription>
              Downgrade to the free plan and cancel your subscription
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                If you cancel your subscription, you&apos;ll be downgraded to the free plan at the
                end of your current billing period ({formatDate(subscriptionInfo?.currentPeriodEnd)}
                ). You&apos;ll lose access to:
              </AlertDescription>
            </Alert>

            <div className="ml-4">
              <ul className="space-y-1 text-sm text-muted-foreground">
                {currentPlan.features
                  .filter(
                    (feature) =>
                      !PRICING.free.features.some((freeFeature) => freeFeature === feature)
                  )
                  .map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      {feature}
                    </li>
                  ))}
              </ul>
            </div>

            <div className="pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isCanceling}>
                    {isCanceling ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      'Cancel Subscription'
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel your {currentPlan.name} subscription. You&apos;ll continue to
                      have access until {formatDate(subscriptionInfo?.currentPeriodEnd)}, after
                      which you&apos;ll be automatically downgraded to the free plan.
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Canceled Subscription Status - Show for canceled subscriptions not in grace period */}
      {isPaidPlan && subscriptionInfo?.status === 'canceled' && !isInGracePeriod && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Subscription Expired
            </CardTitle>
            <CardDescription>
              Your subscription has ended and you&apos;ve been downgraded to the free plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your {currentPlan.name} subscription ended on{' '}
                {formatDate(subscriptionInfo?.currentPeriodEnd)}. You can upgrade to a new plan
                anytime below.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Options - Show based on eligibility */}
      {(eligibility?.canCreateNew || eligibility?.canUpgrade) && currentTier !== 'business' && (
        <Card>
          <CardHeader>
            <CardTitle>
              {currentTier === 'free' ? 'Choose Your Plan' : 'Upgrade Your Plan'}
            </CardTitle>
            <CardDescription>
              {currentTier === 'free'
                ? 'Select a plan to unlock more features and capabilities'
                : 'Get access to more features and higher limits'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(PRICING).map(([tier, plan]) => {
                if (tier === currentTier && currentTier !== 'free') return null;
                if (tier === 'free') return null;

                const isUpgrade = plan.price > currentPlan.price;
                const isSameTier = tier === currentTier;

                return (
                  <Card key={tier} className={`relative ${isSameTier ? 'border-primary' : ''}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {plan.name}
                        {tier === 'pro' && <Badge variant="secondary">Most Popular</Badge>}
                        {isSameTier && <Badge variant="outline">Current</Badge>}
                      </CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-3xl font-bold">${plan.price}</div>
                      <div className="text-sm text-muted-foreground">per month</div>

                      <ul className="space-y-2">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {!isSameTier && (
                        <Button
                          onClick={() => onUpgrade(tier)}
                          disabled={upgradeLoading === tier}
                          className="w-full"
                        >
                          {upgradeLoading === tier ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `${isUpgrade ? 'Upgrade' : 'Subscribe'} to ${plan.name}`
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
      )}

      {/* Billing Information */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>Your billing details and payment history</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Billing is managed through Polar. You can update your payment methods and view
              detailed billing history in your Polar dashboard.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
