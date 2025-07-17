import { Polar } from '@polar-sh/sdk';
import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { eq, desc, lt } from 'drizzle-orm';
import { SubscriptionStatus } from '@/lib/db/schema';

// Initialize Polar client
const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production',
});

/**
 * Enhanced syncing utilities for Polar data
 * Combines webhook-based real-time sync with periodic reconciliation
 */

/**
 * Sync a single user's subscription data from Polar
 * Call this when webhooks may have been missed or for critical operations
 */
export async function syncUserSubscriptionFromPolar(clerkUserId: string): Promise<{
  success: boolean;
  message: string;
  subscription?: unknown;
}> {
  try {
    console.log('🔄 Syncing subscription from Polar for user:', clerkUserId);

    // Get local subscription data
    const localSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.clerkUserId, clerkUserId),
      orderBy: [desc(userSubscriptions.createdAt)],
    });

    if (!localSubscription?.subscriptionId) {
      return {
        success: true,
        message: 'No active subscription to sync',
      };
    }

    // Fetch latest data from Polar
    let polarSubscription;
    try {
      polarSubscription = await polar.subscriptions.get({
        id: localSubscription.subscriptionId,
      });
    } catch (polarError: unknown) {
      const error = polarError as { status?: number };
      if (error.status === 404) {
        // Subscription no longer exists in Polar - mark as canceled locally
        await db
          .update(userSubscriptions)
          .set({
            status: SubscriptionStatus.CANCELED,
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.subscriptionId, localSubscription.subscriptionId));

        return {
          success: true,
          message: 'Subscription no longer exists in Polar - marked as canceled locally',
        };
      }
      throw polarError;
    }

    // Update local data with Polar data
    const updateData = {
      status: polarSubscription.status || localSubscription.status,
      // Add other fields based on Polar's actual response structure
      updatedAt: new Date(),
    };

    await db
      .update(userSubscriptions)
      .set(updateData)
      .where(eq(userSubscriptions.subscriptionId, localSubscription.subscriptionId));

    console.log('✅ Successfully synced subscription from Polar');

    return {
      success: true,
      message: 'Subscription synced successfully',
      subscription: polarSubscription,
    };
  } catch (error) {
    console.error('💥 Error syncing subscription from Polar:', error);
    return {
      success: false,
      message: `Failed to sync subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Periodic sync for stale subscription data
 * Run this as a cron job or when subscription data is critical
 */
export async function syncStaleSubscriptions(staleHours: number = 24): Promise<{
  syncedCount: number;
  errors: string[];
}> {
  try {
    console.log(`🔄 Syncing subscriptions older than ${staleHours} hours`);

    const staleThreshold = new Date(Date.now() - staleHours * 60 * 60 * 1000);

    // Find subscriptions that haven't been synced recently
    const staleSubscriptions = await db.query.userSubscriptions.findMany({
      where: lt(userSubscriptions.updatedAt, staleThreshold),
      limit: 50, // Process in batches
    });

    const errors: string[] = [];
    let syncedCount = 0;

    for (const subscription of staleSubscriptions) {
      try {
        const result = await syncUserSubscriptionFromPolar(subscription.clerkUserId);
        if (result.success) {
          syncedCount++;
        } else {
          errors.push(`${subscription.clerkUserId}: ${result.message}`);
        }

        // Rate limiting - avoid overwhelming Polar API
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errors.push(
          `${subscription.clerkUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    console.log(`✅ Synced ${syncedCount} subscriptions, ${errors.length} errors`);

    return { syncedCount, errors };
  } catch (error) {
    console.error('💥 Error in syncStaleSubscriptions:', error);
    return {
      syncedCount: 0,
      errors: [`Global error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

/**
 * Enhanced user subscription getter with sync fallback
 * Use this instead of the basic getUserSubscription for critical operations
 */
export async function getUserSubscriptionWithSync(clerkUserId: string, forceSync: boolean = false) {
  // First try the normal getter
  const { getUserSubscription } = await import('./utils');
  const subscription = await getUserSubscription(clerkUserId);

  // If no active subscription or forceSync is requested, try syncing from Polar
  if (forceSync || (!subscription.activeSubscription && subscription.tier === 'free')) {
    console.log('🔄 Attempting Polar sync for user:', clerkUserId);
    const syncResult = await syncUserSubscriptionFromPolar(clerkUserId);

    if (syncResult.success) {
      // Re-fetch after sync
      return await getUserSubscription(clerkUserId);
    }
  }

  return subscription;
}

/**
 * Emergency data recovery - sync all subscriptions
 * Use this if you suspect widespread webhook failures
 */
export async function emergencyFullSync(limit: number = 100): Promise<{
  processed: number;
  synced: number;
  errors: string[];
}> {
  console.log('🚨 Starting emergency full sync of all subscriptions');

  const allSubscriptions = await db.query.userSubscriptions.findMany({
    limit,
    orderBy: [desc(userSubscriptions.updatedAt)],
  });

  const errors: string[] = [];
  let processed = 0;
  let synced = 0;

  for (const subscription of allSubscriptions) {
    try {
      processed++;
      const result = await syncUserSubscriptionFromPolar(subscription.clerkUserId);
      if (result.success) {
        synced++;
      } else {
        errors.push(`${subscription.clerkUserId}: ${result.message}`);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (error) {
      errors.push(
        `${subscription.clerkUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  console.log(`🚨 Emergency sync complete: ${synced}/${processed} synced, ${errors.length} errors`);

  return { processed, synced, errors };
}
