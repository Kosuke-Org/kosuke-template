import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  reactivateUserSubscription,
  getSubscriptionEligibility,
  getUserSubscription,
} from '@/lib/billing';
import { ensureUserSynced } from '@/lib/auth';
import { ApiErrorHandler } from '@/lib/api/errors';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user is synced to local database
    await ensureUserSynced(clerkUser);

    // Get user's current subscription and check eligibility
    const subscriptionInfo = await getUserSubscription(clerkUser.id);
    const eligibility = getSubscriptionEligibility(subscriptionInfo);

    // Validate reactivation eligibility
    if (!eligibility.canReactivate) {
      return NextResponse.json(
        {
          error: 'Subscription cannot be reactivated',
          reason: 'Subscription is not in a state that allows reactivation',
          currentState: eligibility.state,
        },
        { status: 400 }
      );
    }

    // Validate that subscription exists and has a valid Stripe subscription ID
    if (!subscriptionInfo.activeSubscription?.stripeSubscriptionId) {
      return NextResponse.json(
        { error: 'No valid subscription found to reactivate' },
        { status: 400 }
      );
    }

    // Reactivate the subscription via Stripe
    const result = await reactivateUserSubscription(
      clerkUser.id,
      subscriptionInfo.activeSubscription.stripeSubscriptionId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      gracePeriodEnds: eligibility.gracePeriodEnds?.toISOString(),
      subscription: {
        id: subscriptionInfo.activeSubscription.stripeSubscriptionId,
        tier: subscriptionInfo.activeSubscription.tier,
        status: 'active',
      },
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return ApiErrorHandler.internalServerError('Failed to reactivate subscription');
  }
}
