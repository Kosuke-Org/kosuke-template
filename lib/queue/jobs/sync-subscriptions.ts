import { runPeriodicSync } from '@/lib/billing/cron-sync';
import type { SubscriptionSyncJobData } from '../queues/subscriptions';

/**
 * Subscription Sync Job Processor
 *
 * Pure business logic - no worker-specific code.
 * Returns structured result for worker to handle.
 */
export async function processSubscriptionSync(data: SubscriptionSyncJobData): Promise<{
  success: boolean;
  syncedCount: number;
  errorCount: number;
  timestamp: string;
  duration: number;
}> {
  console.log('[JOB] 🔄 Starting subscription sync...', data.manual ? '(manual)' : '(scheduled)');

  if (data.userId) {
    console.log(`[JOB] 👤 Syncing subscription for user: ${data.userId}`);
  }

  const startTime = Date.now();

  // Business logic here
  const result = await runPeriodicSync();

  const duration = Date.now() - startTime;

  if (!result.success) {
    throw new Error(result.error); // Throw to trigger retry mechanism
  }

  console.log('[JOB] ✅ Subscription sync completed:', {
    duration: `${duration}ms`,
    syncedCount: result.syncedCount,
    errorCount: result.errorCount,
  });

  return {
    success: true,
    syncedCount: result.syncedCount ?? 0,
    errorCount: result.errorCount ?? 0,
    timestamp: result.timestamp,
    duration,
  };
}
