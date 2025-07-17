import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { ensureUserSynced } from '@/lib/user-sync';
import { getUserSubscription } from '@/lib/billing/utils';
import { ApiErrorHandler } from '@/lib/api/errors';

export async function GET() {
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
    const localUser = await ensureUserSynced(clerkUser);

    // Use the centralized getUserSubscription utility
    const subscriptionInfo = await getUserSubscription(clerkUser.id);

    return NextResponse.json({
      tier: subscriptionInfo.tier,
      status: subscriptionInfo.status,
      currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
      activeSubscription: subscriptionInfo.activeSubscription,
      user: {
        localId: localUser.id,
        clerkId: localUser.clerkUserId,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return ApiErrorHandler.internalServerError('Failed to fetch subscription status');
  }
}
