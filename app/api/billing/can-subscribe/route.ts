import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { ensureUserSynced } from '@/lib/user-sync';
import { getUserSubscription, canCreateNewSubscription } from '@/lib/billing/utils';
import { ApiErrorHandler } from '@/lib/api/errors';

export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return ApiErrorHandler.unauthorized();
    }

    // Ensure user is synced to local database
    await ensureUserSynced(user);

    // Check user's current subscription status
    const currentSubscription = await getUserSubscription(user.id);

    // Check if user can create a new subscription
    const eligibility = canCreateNewSubscription(currentSubscription);

    return NextResponse.json({
      canSubscribe: eligibility.canCreate,
      reason: eligibility.reason || null,
      currentSubscription: {
        tier: currentSubscription.tier,
        status: currentSubscription.status,
        currentPeriodEnd: currentSubscription.currentPeriodEnd,
        isInGracePeriod:
          currentSubscription.status === 'canceled' &&
          currentSubscription.currentPeriodEnd &&
          new Date() < currentSubscription.currentPeriodEnd,
      },
    });
  } catch (error) {
    console.error('💥 ERROR checking subscription eligibility:', error);
    return ApiErrorHandler.internalServerError('Failed to check subscription eligibility');
  }
}
