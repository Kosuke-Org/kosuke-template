import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ensureUserSynced } from '@/lib/user-sync';
import { getUserSubscription, getSubscriptionEligibility } from '@/lib/billing';
import { ApiErrorHandler } from '@/lib/api/errors';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return ApiErrorHandler.unauthorized();
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user is synced to local database
    await ensureUserSynced(user);

    // Check user's current subscription status
    const currentSubscription = await getUserSubscription(user.id);

    // Check user subscription eligibility
    const eligibility = getSubscriptionEligibility(currentSubscription);

    return NextResponse.json({
      canSubscribe: eligibility.canCreateNew || eligibility.canUpgrade,
      canCreateNew: eligibility.canCreateNew,
      canUpgrade: eligibility.canUpgrade,
      canReactivate: eligibility.canReactivate,
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
