import { db } from '@/lib/db';
import { users, activityLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  ClerkUser,
  ClerkWebhookUser,
  UserSyncResult,
  SyncResult,
  SyncOptions,
  ActivityType,
  LocalUser,
} from './types';
import {
  extractUserData,
  extractUserDataFromWebhook,
  hasUserChanges,
  isSyncStale,
  createActivityLogData,
} from './utils';

/**
 * Syncs a Clerk user to the local database
 * Creates a new user if doesn't exist, updates if data has changed
 */
export async function syncUserFromClerk(
  clerkUser: ClerkUser,
  options: SyncOptions = {}
): Promise<UserSyncResult> {
  try {
    console.log('🔄 Syncing user from Clerk:', clerkUser.id);

    // Check if user already exists in our database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUser.id),
    });

    const userData = extractUserData(clerkUser);
    let user: UserSyncResult;

    if (existingUser) {
      console.log('👤 User exists, checking for updates...');

      // Check if any data has changed or if force sync is requested
      const dataChanged = hasUserChanges(existingUser, userData);

      if (dataChanged || options.forceSync) {
        console.log('📝 User data changed, updating...');

        // Update existing user
        await db.update(users).set(userData).where(eq(users.clerkUserId, clerkUser.id));

        user = { id: existingUser.id, clerkUserId: clerkUser.id };

        // Log the update activity if requested
        if (options.includeActivity) {
          await logUserActivity(clerkUser.id, ActivityType.UPDATE_ACCOUNT);
        }
      } else {
        console.log('✅ User data unchanged, updating sync timestamp only');

        // Just update the sync timestamp
        await db
          .update(users)
          .set({ lastSyncedAt: new Date() })
          .where(eq(users.clerkUserId, clerkUser.id));

        user = { id: existingUser.id, clerkUserId: clerkUser.id };
      }
    } else {
      console.log('🆕 Creating new user in database...');

      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          createdAt: new Date(),
        })
        .returning({ id: users.id, clerkUserId: users.clerkUserId });

      user = newUser;

      // Log the signup activity if requested
      if (options.includeActivity) {
        await logUserActivity(clerkUser.id, ActivityType.SIGN_UP);
      }

      console.log('✅ New user created with ID:', newUser.id);
    }

    return user;
  } catch (error) {
    console.error('💥 Error syncing user from Clerk:', error);
    throw error;
  }
}

/**
 * Syncs a Clerk user from webhook data (different structure than API User object)
 */
export async function syncUserFromWebhook(
  webhookUser: ClerkWebhookUser,
  options: SyncOptions = {}
): Promise<UserSyncResult> {
  try {
    console.log('🔄 Syncing user from webhook:', webhookUser.id);

    // Check if user already exists in our database
    const existingUser = await getUserByClerkId(webhookUser.id);
    const userData = extractUserDataFromWebhook(webhookUser);
    let user: UserSyncResult;

    if (existingUser) {
      console.log('👤 User exists, checking for updates...');

      // Check if any data has changed or if force sync is requested
      const dataChanged = hasUserChanges(existingUser, userData);

      if (dataChanged || options.forceSync) {
        console.log('📝 User data changed, updating...');

        // Update existing user
        await db.update(users).set(userData).where(eq(users.clerkUserId, webhookUser.id));

        user = { id: existingUser.id, clerkUserId: webhookUser.id };

        // Log the update activity if requested
        if (options.includeActivity) {
          await logUserActivity(webhookUser.id, ActivityType.UPDATE_ACCOUNT);
        }
      } else {
        console.log('✅ User data unchanged, updating sync timestamp only');

        // Just update the sync timestamp
        await db
          .update(users)
          .set({ lastSyncedAt: new Date() })
          .where(eq(users.clerkUserId, webhookUser.id));

        user = { id: existingUser.id, clerkUserId: webhookUser.id };
      }
    } else {
      console.log('🆕 Creating new user in database...');

      // Create new user
      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          createdAt: new Date(),
        })
        .returning({ id: users.id, clerkUserId: users.clerkUserId });

      user = newUser;

      // Log the signup activity if requested
      if (options.includeActivity) {
        await logUserActivity(webhookUser.id, ActivityType.SIGN_UP);
      }

      console.log('✅ New user created with ID:', newUser.id);
    }

    return user;
  } catch (error) {
    console.error('💥 Error syncing user from webhook:', error);
    throw error;
  }
}

/**
 * Gets a user from local database by Clerk user ID
 */
export async function getUserByClerkId(clerkUserId: string): Promise<LocalUser | undefined> {
  return await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });
}

/**
 * Logs user activity
 */
export async function logUserActivity(
  clerkUserId: string,
  action: ActivityType,
  metadata?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    const activityData = createActivityLogData(clerkUserId, action, metadata, ipAddress);

    await db.insert(activityLogs).values(activityData);

    console.log(`📝 Logged activity: ${action} for user ${clerkUserId}`);
  } catch (error) {
    console.error('Error logging user activity:', error);
    // Don't throw - activity logging shouldn't break the main flow
  }
}

/**
 * Ensures user exists in local database with smart sync logic
 * Call this in API routes that need local user data
 */
export async function ensureUserSynced(
  clerkUser: ClerkUser,
  options: SyncOptions = {}
): Promise<UserSyncResult> {
  const localUser = await getUserByClerkId(clerkUser.id);

  if (!localUser) {
    console.log('🔄 User not found locally, syncing from Clerk...');
    return await syncUserFromClerk(clerkUser, { ...options, includeActivity: true });
  }

  // Check if sync is stale or force sync is requested
  if (isSyncStale(localUser.lastSyncedAt) || options.forceSync) {
    console.log('🔄 User sync is stale, refreshing...');
    return await syncUserFromClerk(clerkUser, options);
  }

  return { id: localUser.id, clerkUserId: localUser.clerkUserId };
}

/**
 * Bulk sync users (useful for migrations or batch operations)
 */
export async function bulkSyncUsers(
  users: ClerkUser[],
  options: SyncOptions = {}
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const user of users) {
    try {
      const syncResult = await syncUserFromClerk(user, options);
      results.push({
        success: true,
        user: syncResult,
        wasUpdated: true,
      });
    } catch (error) {
      console.error(`Failed to sync user ${user.id}:`, error);
      results.push({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

/**
 * Get sync statistics for monitoring
 */
export async function getSyncStats(): Promise<{
  totalUsers: number;
  staleUsers: number;
  recentlyUpdated: number;
}> {
  try {
    const allUsers = await db.query.users.findMany();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const staleUsers = allUsers.filter((user) => isSyncStale(user.lastSyncedAt));
    const recentlyUpdated = allUsers.filter((user) => user.lastSyncedAt > dayAgo);

    return {
      totalUsers: allUsers.length,
      staleUsers: staleUsers.length,
      recentlyUpdated: recentlyUpdated.length,
    };
  } catch (error) {
    console.error('Error getting sync stats:', error);
    throw error;
  }
}
