import { db } from '@/lib/db';
import { users, activityLogs, ActivityType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { ServerUser } from '@stackframe/stack';

/**
 * Syncs a StackAuth user to the local database
 * Creates a new user if doesn't exist, updates if data has changed
 */
export async function syncUserFromStackAuth(
  stackAuthUser: ServerUser
): Promise<{ id: number; stackAuthUserId: string }> {
  try {
    console.log('🔄 Syncing user from StackAuth:', stackAuthUser.id);

    // Check if user already exists in our database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.stackAuthUserId, stackAuthUser.id),
    });

    const userData = {
      stackAuthUserId: stackAuthUser.id,
      email: stackAuthUser.primaryEmail || '',
      displayName: stackAuthUser.displayName || null,
      profileImageUrl: stackAuthUser.profileImageUrl || null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    let user: { id: number; stackAuthUserId: string };

    if (existingUser) {
      console.log('👤 User exists, checking for updates...');

      // Check if any data has changed
      const hasChanges =
        existingUser.email !== userData.email ||
        existingUser.displayName !== userData.displayName ||
        existingUser.profileImageUrl !== userData.profileImageUrl;

      if (hasChanges) {
        console.log('📝 User data changed, updating...');

        // Update existing user
        await db.update(users).set(userData).where(eq(users.stackAuthUserId, stackAuthUser.id));

        user = { id: existingUser.id, stackAuthUserId: stackAuthUser.id };

        // Log the update activity
        await logUserActivity(stackAuthUser.id, ActivityType.UPDATE_ACCOUNT);
      } else {
        console.log('✅ User data unchanged, updating sync timestamp only');

        // Just update the sync timestamp
        await db
          .update(users)
          .set({ lastSyncedAt: new Date() })
          .where(eq(users.stackAuthUserId, stackAuthUser.id));

        user = { id: existingUser.id, stackAuthUserId: stackAuthUser.id };
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
        .returning({ id: users.id, stackAuthUserId: users.stackAuthUserId });

      user = newUser;

      // Log the signup activity
      await logUserActivity(stackAuthUser.id, ActivityType.SIGN_UP);

      console.log('✅ New user created with ID:', newUser.id);
    }

    return user;
  } catch (error) {
    console.error('💥 Error syncing user from StackAuth:', error);
    throw error;
  }
}

/**
 * Gets a user from local database by StackAuth UUID
 */
export async function getUserByStackAuthId(stackAuthUserId: string) {
  return await db.query.users.findFirst({
    where: eq(users.stackAuthUserId, stackAuthUserId),
  });
}

/**
 * Logs user activity
 */
export async function logUserActivity(
  stackAuthUserId: string,
  action: ActivityType,
  metadata?: Record<string, unknown>,
  ipAddress?: string
) {
  try {
    await db.insert(activityLogs).values({
      stackAuthUserId,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress,
    });

    console.log(`📝 Logged activity: ${action} for user ${stackAuthUserId}`);
  } catch (error) {
    console.error('Error logging user activity:', error);
    // Don't throw - activity logging shouldn't break the main flow
  }
}

/**
 * Ensures user exists in local database
 * Call this in API routes that need local user data
 */
export async function ensureUserSynced(stackAuthUser: ServerUser) {
  const localUser = await getUserByStackAuthId(stackAuthUser.id);

  if (!localUser) {
    console.log('🔄 User not found locally, syncing from StackAuth...');
    return await syncUserFromStackAuth(stackAuthUser);
  }

  // Check if sync is stale (older than 24 hours)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (localUser.lastSyncedAt < dayAgo) {
    console.log('🔄 User sync is stale, refreshing...');
    return await syncUserFromStackAuth(stackAuthUser);
  }

  return { id: localUser.id, stackAuthUserId: localUser.stackAuthUserId };
}
