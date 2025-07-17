import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { cancelUserSubscription, getUserSubscription } from '@/lib/billing';
import { ensureUserSynced } from '@/lib/user-sync';

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Ensure user is synced to local database
    await ensureUserSynced(clerkUser);

    // Get user's current subscription
    const subscriptionInfo = await getUserSubscription(clerkUser.id);

    if (!subscriptionInfo.activeSubscription || subscriptionInfo.tier === 'free') {
      return NextResponse.json({ error: 'No active subscription to cancel' }, { status: 400 });
    }

    // Validate that subscription has a valid subscription ID
    if (!subscriptionInfo.activeSubscription.subscriptionId) {
      return NextResponse.json(
        { error: 'Invalid subscription: missing subscription ID' },
        { status: 400 }
      );
    }

    // Cancel the subscription
    await cancelUserSubscription(clerkUser.id, subscriptionInfo.activeSubscription.subscriptionId);

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
