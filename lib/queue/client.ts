import { Queue, Worker, QueueEvents } from 'bullmq';

import { redis, closeRedis } from '@/lib/redis';

/**
 * Default queue options for consistent behavior across all queues
 * @internal - Used internally by createQueue factory
 */
const defaultQueueOptions = {
  connection: redis,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential' as const,
      delay: 1000, // Start with 1 second delay, exponentially increase
    },
    removeOnComplete: {
      age: 7 * 24 * 60 * 60, // 7 days in seconds
      count: 1000, // Keep maximum 1000 completed jobs
    },
    removeOnFail: {
      age: 14 * 24 * 60 * 60, // 14 days in seconds (keep failures longer for debugging)
      count: 5000, // Keep maximum 5000 failed jobs
    },
  },
};

/**
 * Default worker options for consistent error handling and concurrency
 * @internal - Used internally by createWorker factory
 */
const defaultWorkerOptions = {
  connection: redis,
  concurrency: 5, // Process 5 jobs concurrently
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
};

/**
 * Type-safe queue creation helper
 */
export function createQueue<T = unknown>(name: string) {
  return new Queue<T>(name, defaultQueueOptions);
}

/**
 * Type-safe worker creation helper
 */
export function createWorker<T = unknown>(
  name: string,
  processor: (job: { data: T; id?: string }) => Promise<unknown>
) {
  return new Worker<T>(name, async (job) => processor(job), defaultWorkerOptions);
}

/**
 * Create queue events listener for monitoring
 */
export function createQueueEvents(name: string) {
  return new QueueEvents(name, {
    connection: redis,
  });
}

/**
 * Graceful shutdown handler for workers and Redis connection
 * Call this when shutting down the application to ensure jobs are completed
 */
export async function gracefulShutdown(workers: Worker[]) {
  console.log('🛑 Gracefully shutting down workers...');

  await Promise.all(
    workers.map(async (worker) => {
      await worker.close();
    })
  );

  console.log('✅ All workers shut down successfully');

  // Close Redis connection after workers are closed
  await closeRedis();
}
