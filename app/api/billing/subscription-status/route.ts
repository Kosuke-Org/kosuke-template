import { NextResponse } from 'next/server';
import { stackServerApp } from '@/stack';
import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's subscription info
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, parseInt(user.id)),
      with: {
        subscriptions: {
          where: eq(subscriptions.status, 'active'),
          orderBy: (subscriptions, { desc }) => [desc(subscriptions.createdAt)],
          limit: 1,
        },
      },
    });

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const subscriptionInfo = {
      tier: userRecord.subscriptionTier,
      status: userRecord.subscriptionStatus,
      currentPeriodEnd: userRecord.currentPeriodEnd,
      activeSubscription: userRecord.subscriptions[0] || null,
    };

    return NextResponse.json(subscriptionInfo);
  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
