import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { ensureUserSynced } from '@/lib/user-sync';

export async function GET() {
  try {
    const stackAuthUser = await stackServerApp.getUser();

    if (!stackAuthUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure user is synced to local database
    const localUser = await ensureUserSynced(stackAuthUser);
    console.log('✅ User synced for subscription check - Local ID:', localUser.id);

    // Get user's active subscription from StackAuth-compatible table
    const activeSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.stackAuthUserId, stackAuthUser.id),
      orderBy: [desc(userSubscriptions.createdAt)],
    });

    // Determine current tier and status
    let tier = 'free'; // Default to free
    let status = null;
    let currentPeriodEnd = null;

    if (activeSubscription && activeSubscription.status === 'active') {
      tier = activeSubscription.tier;
      status = activeSubscription.status;
      currentPeriodEnd = activeSubscription.currentPeriodEnd;
    } else if (activeSubscription) {
      // User had a subscription but it's not active anymore
      status = activeSubscription.status;
      currentPeriodEnd = activeSubscription.currentPeriodEnd;

      // Check if subscription is still within the period (grace period)
      if (activeSubscription.currentPeriodEnd && new Date() < activeSubscription.currentPeriodEnd) {
        tier = activeSubscription.tier; // Still in grace period
      }
    }

    const subscriptionInfo = {
      tier,
      status,
      currentPeriodEnd,
      activeSubscription,
      user: {
        localId: localUser.id,
        stackAuthId: localUser.stackAuthUserId,
      },
    };

    return NextResponse.json(subscriptionInfo);
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
