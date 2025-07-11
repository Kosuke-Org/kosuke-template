import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { cancelUserSubscription } from '@/lib/billing/utils';
import { getUserSubscription } from '@/lib/billing/utils';
import { ensureUserSynced } from '@/lib/user-sync';

export async function POST() {
  try {
    const stackAuthUser = await stackServerApp.getUser();

    if (!stackAuthUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user is synced to local database
    await ensureUserSynced(stackAuthUser);

    // Get user's current subscription
    const subscriptionInfo = await getUserSubscription(stackAuthUser.id);

    if (!subscriptionInfo.activeSubscription || subscriptionInfo.tier === 'free') {
      return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 });
    }

    // Cancel the subscription
    await cancelUserSubscription(
      stackAuthUser.id,
      subscriptionInfo.activeSubscription.subscriptionId
    );

    return NextResponse.json({
      success: true,
      message:
        'Subscription cancelled successfully. Access will continue until the end of your billing period.',
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
