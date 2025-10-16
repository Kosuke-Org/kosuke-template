import { syncStaleSubscriptions } from './stripe-sync';

/**
 * Cron job handler for periodic subscription syncing
 * Use this with Vercel Cron, GitHub Actions, or your preferred scheduler
 *
 * For Vercel Cron, add cron config to vercel.json
 * Run every 6 hours with schedule 0 star/6 star star star
 * Path to use: /api/cron/sync-subscriptions
 */

export async function runPeriodicSync() {
  console.log('🕐 Starting periodic subscription sync...');

  try {
    const result = await syncStaleSubscriptions(6); // Sync subscriptions older than 6 hours

    console.log(
      `✅ Periodic sync completed: ${result.syncedCount} synced, ${result.errors.length} errors`
    );

    if (result.errors.length > 0) {
      console.warn('⚠️ Sync errors:', result.errors.slice(0, 5)); // Log first 5 errors
    }

    return {
      success: true,
      syncedCount: result.syncedCount,
      errorCount: result.errors.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('💥 Periodic sync failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}
/**
 * Health check for sync system
 */
export async function checkSyncHealth() {
  // Add health checks like database connectivity, Stripe API status, etc.
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: 'ok', // You can add actual DB ping here
      stripeApi: 'ok', // You can add actual Stripe API ping here
    },
  };
}
