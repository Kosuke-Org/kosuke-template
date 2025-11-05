import { runPeriodicSync } from '@/lib/billing/cron-sync';
import type { SubscriptionSyncJobData } from '../queues/subscriptions';

/**
 * Subscription sync job processor
 * Migrated from /api/cron/sync-subscriptions
 *
 * This job runs periodically to sync subscription data from Stripe
 * to the local database, ensuring billing information stays up-to-date
 */
export async function processSubscriptionSync(data: SubscriptionSyncJobData) {
  const { userId, manual } = data;

  console.log(
    `🕐 BullMQ: Starting subscription sync... ${manual ? '(manual trigger)' : '(scheduled)'}`
  );

  if (userId) {
    console.log(`👤 Syncing subscription for user: ${userId}`);
  }

  try {
    // Run the periodic sync (same logic as the original cron job)
    const result = await runPeriodicSync();

    // Log the result
    if (result.success) {
      console.log(
        `✅ BullMQ: Sync completed successfully - ${result.syncedCount} synced, ${result.errorCount} errors`
      );

      return {
        success: true,
        syncedCount: result.syncedCount,
        errorCount: result.errorCount,
        timestamp: result.timestamp,
      };
    } else {
      console.error(`💥 BullMQ: Sync failed - ${result.error}`);

      // Throw error to trigger retry mechanism
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('💥 BullMQ: Unexpected error in sync job:', error);

    // Re-throw to mark job as failed and trigger retries
    throw error;
  }
}
