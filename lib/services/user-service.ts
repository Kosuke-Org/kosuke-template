/**
 * User Service
 * Handles all user-related database operations and business logic
 * Separates data access from API layer (tRPC routers)
 */
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';
import { ERRORS, ERROR_MESSAGES } from '@/lib/services';
import type { NotificationSettings } from '@/lib/types';

/**
 * Get user by ID
 * @throws Error if user not found
 */
export async function getUserById(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      emailVerified: users.emailVerified,
      displayName: users.displayName,
      profileImageUrl: users.profileImageUrl,
      stripeCustomerId: users.stripeCustomerId,
      notificationSettings: users.notificationSettings,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND, {
      cause: ERRORS.NOT_FOUND,
    });
  }

  return user;
}

/**
 * Get user's notification settings
 */
export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  const [user] = await db
    .select({ notificationSettings: users.notificationSettings })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const defaultSettings: NotificationSettings = {
    emailNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
  };

  if (!user?.notificationSettings) {
    return defaultSettings;
  }

  try {
    return JSON.parse(user.notificationSettings);
  } catch {
    return defaultSettings;
  }
}

/**
 * Update user's notification settings
 * Returns both old and new settings for side effect handling
 */
export async function updateNotificationSettings(
  userId: string,
  settings: NotificationSettings
): Promise<{
  oldSettings: NotificationSettings;
  newSettings: NotificationSettings;
  userEmail: string;
}> {
  // Get current settings and email
  const [user] = await db
    .select({ notificationSettings: users.notificationSettings, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND, { cause: ERRORS.NOT_FOUND });
  }

  const oldSettings: NotificationSettings = user.notificationSettings
    ? JSON.parse(user.notificationSettings)
    : { emailNotifications: true, marketingEmails: false, securityAlerts: true };

  // Update settings in database
  await db
    .update(users)
    .set({
      notificationSettings: JSON.stringify(settings),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    oldSettings,
    newSettings: settings,
    userEmail: user.email,
  };
}

/**
 * Update user's display name
 * Returns the updated user record
 */
export async function updateDisplayName(userId: string, displayName: string) {
  const [updated] = await db
    .update(users)
    .set({
      displayName,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      displayName: users.displayName,
    });

  if (!updated) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND, { cause: ERRORS.NOT_FOUND });
  }

  return updated;
}

/**
 * Get user's profile image URL
 */
export async function getProfileImageUrl(userId: string): Promise<string | null> {
  const [user] = await db
    .select({ profileImageUrl: users.profileImageUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.profileImageUrl || null;
}

/**
 * Check if user is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.role === 'admin';
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  emailVerified?: boolean;
  displayName?: string;
  notificationSettings?: NotificationSettings;
}) {
  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      emailVerified: data.emailVerified ?? false,
      displayName: data.displayName ?? '',
      notificationSettings: data.notificationSettings
        ? JSON.stringify(data.notificationSettings)
        : JSON.stringify({
            emailNotifications: false,
            marketingEmails: false,
            securityAlerts: false,
          }),
    })
    .returning();

  return user;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return user || null;
}

/**
 * Delete user's profile image
 * Returns the profile image URL that needs to be deleted from storage
 * Throws Error if user not found or no profile image exists
 */
export async function deleteUserProfileImage(userId: string): Promise<string> {
  const [user] = await db
    .select({
      id: users.id,
      profileImageUrl: users.profileImageUrl,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND, { cause: ERRORS.NOT_FOUND });
  }

  if (!user.profileImageUrl) {
    throw new Error('No profile image to delete', { cause: ERRORS.NOT_FOUND });
  }

  await db
    .update(users)
    .set({
      profileImageUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return user.profileImageUrl;
}
