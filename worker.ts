/**
 * Standalone BullMQ Worker Process
 *
 * This file runs as a separate process/container dedicated to processing background jobs.
 * Separating workers from the web server allows independent scaling and better resource isolation.
 *
 * Usage:
 *   - Development: bun run workers:dev
 *   - Production: bun run workers:start
 */
import {
  documentsQueue,
  documentsWorker,
  gracefulShutdown,
  scheduleAllJobs,
  subscriptionQueue,
  subscriptionWorker,
} from './lib/queue';

async function main() {
  console.log('[WORKER] 🚀 Starting BullMQ worker process...\n');

  try {
    // Schedule all recurring jobs (idempotent - safe to call multiple times)
    await scheduleAllJobs();

    console.log('[WORKER] ✅ Worker process initialized and ready');
    console.log('[WORKER] 📊 Active workers:');
    console.log('[WORKER]   - Subscriptions (concurrency: 2)\n');
    console.log('[WORKER]   - Documents (concurrency: 5)\n');

    // Store references for graceful shutdown
    const workers = [subscriptionWorker, documentsWorker];
    const queues = [subscriptionQueue, documentsQueue];

    // Graceful shutdown handlers
    process.on('SIGTERM', async () => {
      console.log('[WORKER] 📛 Received SIGTERM, shutting down gracefully...');
      await gracefulShutdown(workers, queues);
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('[WORKER] 📛 Received SIGINT, shutting down gracefully...');
      await gracefulShutdown(workers, queues);
      process.exit(0);
    });
  } catch (error) {
    console.error('[WORKER] ❌ Failed to start worker:', error);
    process.exit(1);
  }
}

main();
