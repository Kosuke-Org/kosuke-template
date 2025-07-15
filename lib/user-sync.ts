import { db } from '@/lib/db';
import { users, activityLogs, ActivityType } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { User } from '@clerk/nextjs/server';

/**
 * Syncs a Clerk user to the local database
 * Creates a new user if doesn't exist, updates if data has changed
 */
export async function syncUserFromClerk(
  clerkUser: User
): Promise<{ id: number; clerkUserId: string }> {
  try {
    console.log('🔄 Syncing user from Clerk:', clerkUser.id);

    // Check if user already exists in our database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUser.id),
    });

    const userData = {
      clerkUserId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      displayName: clerkUser.fullName || clerkUser.firstName || null,
      profileImageUrl: clerkUser.imageUrl || null,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };

    let user: { id: number; clerkUserId: string };

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
        await db.update(users).set(userData).where(eq(users.clerkUserId, clerkUser.id));

        user = { id: existingUser.id, clerkUserId: clerkUser.id };

        // Log the update activity
        await logUserActivity(clerkUser.id, ActivityType.UPDATE_ACCOUNT);
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

      // Log the signup activity
      await logUserActivity(clerkUser.id, ActivityType.SIGN_UP);

      console.log('✅ New user created with ID:', newUser.id);
    }

    return user;
  } catch (error) {
    console.error('💥 Error syncing user from Clerk:', error);
    throw error;
  }
}

/**
 * Gets a user from local database by Clerk user ID
 */
export async function getUserByClerkId(clerkUserId: string) {
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
) {
  try {
    await db.insert(activityLogs).values({
      clerkUserId,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress,
    });

    console.log(`📝 Logged activity: ${action} for user ${clerkUserId}`);
  } catch (error) {
    console.error('Error logging user activity:', error);
    // Don't throw - activity logging shouldn't break the main flow
  }
}

/**
 * Ensures user exists in local database
 * Call this in API routes that need local user data
 */
export async function ensureUserSynced(clerkUser: User) {
  const localUser = await getUserByClerkId(clerkUser.id);

  if (!localUser) {
    console.log('🔄 User not found locally, syncing from Clerk...');
    return await syncUserFromClerk(clerkUser);
  }

  // Check if sync is stale (older than 24 hours)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (localUser.lastSyncedAt < dayAgo) {
    console.log('🔄 User sync is stale, refreshing...');
    return await syncUserFromClerk(clerkUser);
  }

  return { id: localUser.id, clerkUserId: localUser.clerkUserId };
}
