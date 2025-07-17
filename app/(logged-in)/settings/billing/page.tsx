'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { useToast } from '@/lib/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { BillingSkeleton } from '@/components/skeletons';
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

interface SubscriptionInfo {
  tier: string;
  status: string;
  currentPeriodEnd: string | null;
  activeSubscription: Record<string, unknown> | null;
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
  const { toast } = useToast();
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [eligibility, setEligibility] = useState<SubscriptionEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [reactivateLoading, setReactivateLoading] = useState(false);

  const fetchSubscriptionInfo = useCallback(
    async (showLoadingState = false) => {
      if (showLoadingState) {
        setIsLoading(true);
      }
      try {
        // Fetch both subscription status and eligibility
        const [subscriptionResponse, eligibilityResponse] = await Promise.all([
          fetch('/api/billing/subscription-status'),
          fetch('/api/billing/can-subscribe'),
        ]);

        if (subscriptionResponse.ok) {
          const subscriptionData = await subscriptionResponse.json();
          setSubscriptionInfo(subscriptionData);
        } else {
          console.error('Failed to fetch subscription info');
          toast({
            title: 'Error',
            description: 'Failed to load subscription information. Please refresh the page.',
            variant: 'destructive',
          });
        }

        if (eligibilityResponse.ok) {
          const eligibilityData = await eligibilityResponse.json();
          setEligibility({
            canReactivate:
              eligibilityData.currentSubscription?.isInGracePeriod &&
              eligibilityData.currentSubscription?.status === 'canceled',
            canCreateNew: eligibilityData.canSubscribe,
            canUpgrade: eligibilityData.canSubscribe,
            canCancel: eligibilityData.currentSubscription?.status === 'active',
            state: eligibilityData.currentSubscription?.status || 'free',
            gracePeriodEnds: eligibilityData.currentSubscription?.currentPeriodEnd,
            reason: eligibilityData.reason,
          });
        }
      } catch (error) {
        console.error('Error fetching subscription info:', error);
        toast({
          title: 'Error',
          description: 'Failed to load subscription information. Please check your connection.',
          variant: 'destructive',
        });
      } finally {
        if (showLoadingState) {
          setIsLoading(false);
        }
      }
    },
    [toast]
  );

  useEffect(() => {
    fetchSubscriptionInfo(true);
  }, [fetchSubscriptionInfo]);

  const handleUpgrade = async (tier: string) => {
    setUpgradeLoading(tier);
    try {
      // Determine if this is an upgrade (user has active subscription) or new subscription
      const isUpgrade = currentTier !== 'free' && subscriptionInfo?.status === 'active';
      const endpoint = isUpgrade
        ? '/api/billing/upgrade-subscription'
        : '/api/billing/create-checkout';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tier }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.success && data.checkoutUrl) {
          // Show success message for upgrades
          if (isUpgrade) {
            toast({
              title: 'Upgrade Initiated',
              description: `Your ${currentTier} subscription has been canceled and you'll be redirected to complete your ${tier} upgrade.`,
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
      } else {
        const error = await response.json();

        // Handle upgrade-specific errors
        if (error.requiresNewSubscription) {
          toast({
            title: 'Upgrade Issue',
            description: error.error,
            variant: 'destructive',
          });
          // Refresh the page to show current state
          setTimeout(() => window.location.reload(), 2000);
          return;
        }

        // Following best practices: Handle customer portal redirects
        if (error.action === 'customer_portal_required') {
          toast({
            title: 'Subscription Management Required',
            description:
              error.message || 'Please contact support for subscription management assistance.',
          });
        } else {
          toast({
            title: 'Error',
            description: error.error || 'Failed to process request',
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Failed to create checkout session',
        variant: 'destructive',
      });
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelLoading(true);
    try {
      const response = await fetch('/api/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Show success toast
        toast({
          title: 'Subscription Cancelled',
          description:
            data.message ||
            'Your subscription has been cancelled successfully. You will retain access until the end of your billing period.',
        });

        // Refresh subscription info to update the UI
        await fetchSubscriptionInfo();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Cancellation Failed',
          description: errorData.error || 'Failed to cancel subscription. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: 'Cancellation Failed',
        description: 'Failed to cancel subscription. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setCancelLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setReactivateLoading(true);
    try {
      const response = await fetch('/api/billing/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();

        toast({
          title: 'Subscription Reactivated!',
          description: data.message || 'Your subscription has been successfully reactivated.',
        });

        // Refresh subscription info to update the UI
        await fetchSubscriptionInfo();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Reactivation Failed',
          description: errorData.error || 'Failed to reactivate subscription. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      toast({
        title: 'Reactivation Failed',
        description:
          'Failed to reactivate subscription. Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setReactivateLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateWithTime = (dateString: string | null) => {
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
  const currentPlan = PRICING[currentTier as keyof typeof PRICING];
  const isPaidPlan = currentTier !== 'free' && subscriptionInfo?.activeSubscription;
  const canCancelSubscription = eligibility?.canCancel;
  const canReactivateSubscription = eligibility?.canReactivate;
  const isInGracePeriod =
    subscriptionInfo?.status === 'canceled' &&
    subscriptionInfo?.currentPeriodEnd &&
    new Date() < new Date(subscriptionInfo.currentPeriodEnd);

  return (
    <div className="space-y-6">
      <div>
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
              <h3 className="font-semibold text-lg">{currentPlan.name}</h3>
              <p className="text-sm text-muted-foreground">{currentPlan.description}</p>
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
              You can reactivate your {currentPlan.name} subscription at no additional cost
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
                onClick={handleReactivateSubscription}
                disabled={reactivateLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {reactivateLoading ? (
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
                  <Button variant="destructive" disabled={cancelLoading}>
                    {cancelLoading ? (
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
                      onClick={handleCancelSubscription}
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
                          onClick={() => handleUpgrade(tier)}
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
