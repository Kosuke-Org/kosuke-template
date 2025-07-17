'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { useSubscriptionData } from '@/hooks/use-subscription-data';
import { useSubscriptionActions } from '@/hooks/use-subscription-actions';
import { BillingSkeleton } from '@/components/skeletons';

const plans = [
  {
    name: 'Basic',
    tier: 'basic',
    price: '$9.99',
    period: 'month',
    description: 'Perfect for individuals getting started',
    features: ['Up to 10 projects', 'Basic analytics', 'Email support', '5GB storage'],
    popular: false,
  },
  {
    name: 'Pro',
    tier: 'pro',
    price: '$19.99',
    period: 'month',
    description: 'Best for growing teams and businesses',
    features: [
      'Up to 50 projects',
      'Advanced analytics',
      'Priority support',
      '50GB storage',
      'Team collaboration',
      'Custom integrations',
    ],
    popular: true,
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    price: '$49.99',
    period: 'month',
    description: 'For large organizations with custom needs',
    features: [
      'Unlimited projects',
      'Enterprise analytics',
      '24/7 phone support',
      '500GB storage',
      'Advanced security',
      'Custom contracts',
      'Dedicated account manager',
    ],
    popular: false,
  },
];

export default function BillingPage() {
  const { subscriptionInfo, eligibility, isLoading, refetchSubscriptionInfo } =
    useSubscriptionData();
  const {
    handleUpgrade,
    handleCancel,
    handleReactivate,
    isUpgrading,
    isCanceling,
    isReactivating,
    upgradeLoading,
  } = useSubscriptionActions();

  if (isLoading) {
    return <BillingSkeleton />;
  }

  const currentTier = subscriptionInfo?.tier || 'free';
  const subscriptionStatus = subscriptionInfo?.status;

  const getStatusBadge = () => {
    if (!subscriptionInfo || currentTier === 'free') {
      return <Badge variant="secondary">Free Plan</Badge>;
    }

    switch (subscriptionStatus) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'canceled':
        return eligibility?.canReactivate ? (
          <Badge variant="destructive">Canceled (Grace Period)</Badge>
        ) : (
          <Badge variant="destructive">Canceled</Badge>
        );
      case 'past_due':
        return <Badge className="bg-yellow-500">Payment Required</Badge>;
      case 'incomplete':
        return <Badge variant="outline">Incomplete</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusIcon = () => {
    if (subscriptionStatus === 'active') return <Check className="h-4 w-4 text-green-500" />;
    if (subscriptionStatus === 'canceled') return <X className="h-4 w-4 text-red-500" />;
    if (subscriptionStatus === 'past_due')
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const onUpgrade = (tier: string) => {
    handleUpgrade(tier, currentTier, subscriptionStatus);
  };

  return (
    <div className="space-y-6">
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Current Subscription
              </CardTitle>
              <CardDescription>Manage your billing and subscription settings</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSubscriptionInfo()}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <h3 className="text-lg font-semibold capitalize">{currentTier} Plan</h3>
                {getStatusBadge()}
              </div>
              {subscriptionInfo?.currentPeriodEnd && (
                <p className="text-sm text-muted-foreground">
                  {subscriptionStatus === 'canceled' && eligibility?.canReactivate
                    ? `Access until: ${new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString()}`
                    : `Next billing: ${new Date(subscriptionInfo.currentPeriodEnd).toLocaleDateString()}`}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {eligibility?.canReactivate && (
                <Button
                  onClick={handleReactivate}
                  disabled={isReactivating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isReactivating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reactivate'}
                </Button>
              )}

              {eligibility?.canCancel && (
                <Button onClick={handleCancel} disabled={isCanceling} variant="destructive">
                  {isCanceling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Cancel Subscription'
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Available Plans</h2>
          <p className="text-muted-foreground">Choose the plan that best fits your needs</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrentPlan = plan.tier === currentTier;
            const canUpgradeToThis = eligibility?.canUpgrade || eligibility?.canCreateNew;
            const isUpgradingToThis = upgradeLoading === plan.tier;

            return (
              <Card key={plan.tier} className={`relative ${plan.popular ? 'border-primary' : ''}`}>
                {plan.popular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="space-y-2">
                    <CardTitle className="flex items-center justify-between">
                      {plan.name}
                      {isCurrentPlan && <Badge variant="outline">Current</Badge>}
                    </CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{plan.price}</span>
                      <span className="text-muted-foreground">/{plan.period}</span>
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={
                      isCurrentPlan || !canUpgradeToThis || isUpgrading || isUpgradingToThis
                    }
                    onClick={() => onUpgrade(plan.tier)}
                  >
                    {isUpgradingToThis ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
