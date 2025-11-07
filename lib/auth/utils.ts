import { ActivityType } from '@/lib/db/schema';

/**
 * Create activity log entry data
 */
export function createActivityLogData(
  clerkUserId: string,
  action: ActivityType,
  metadata?: Record<string, unknown>,
  ipAddress?: string
) {
  return {
    clerkUserId,
    action,
    metadata: metadata ? JSON.stringify(metadata) : null,
    ipAddress: ipAddress || null,
    timestamp: new Date(),
  };
}
