/**
 * Worker initialization script
 * Run this to start all BullMQ workers
 *
 * Usage:
 *   - Development: bun run workers:dev
 *   - Production: bun run workers:start
 */
import { gracefulShutdown } from './client';
import { scheduleSubscriptionSync } from './queues/subscriptions';
import { subscriptionWorker } from './workers/subscriptions';

console.log('🚀 Starting BullMQ workers...');

// Schedule recurring jobs
scheduleSubscriptionSync()
  .then(() => {
    console.log('✅ Recurring jobs scheduled');
  })
  .catch((error) => {
    console.error('❌ Failed to schedule recurring jobs:', error);
  });

// List of all workers
const workers = [subscriptionWorker];

console.log(`✅ ${workers.length} worker(s) initialized and running`);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  await gracefulShutdown(workers);
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️  SIGINT received, shutting down gracefully...');
  await gracefulShutdown(workers);
  process.exit(0);
});

// Keep the process alive
process.stdin.resume();
