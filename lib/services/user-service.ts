/**
 * User Service
 * Handles all user-related database operations and business logic
 * Separates data access from API layer (tRPC routers)
 */
import { and, count, eq } from 'drizzle-orm';

import { db } from '@/lib/db/drizzle';
import { orgMemberships, organizations, users } from '@/lib/db/schema';
import { ERRORS, ERROR_MESSAGES } from '@/lib/services';
import type { NotificationSettings } from '@/lib/types';
import { ORG_ROLES, USER_ROLES } from '@/lib/types/organization';

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
 * Create new user
 *
 * Note: Better Auth's admin.createUser doesn't support passwordless authentication yet.
 * See: https://github.com/better-auth/better-auth/issues/4226
 * For now, we create users directly in the database
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
      role: USER_ROLES.USER,
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
 * Returns null if user not found, we want to check if user exists, do not throw error
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

/**
 * Validate if a user can be deleted
 * Checks if user is the sole owner of any organizations
 * @throws Error if user is sole owner of any organization (to prevent orphaned subscriptions)
 */
export async function validateUserDeletion(userId: string): Promise<void> {
  // Check if user is sole owner of any organizations
  const userMemberships = await db
    .select({
      organizationId: orgMemberships.organizationId,
      organizationName: organizations.name,
      role: orgMemberships.role,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(organizations.id, orgMemberships.organizationId))
    .where(and(eq(orgMemberships.userId, userId), eq(orgMemberships.role, ORG_ROLES.OWNER)));

  // For each org where user is owner, check if they're the only owner
  const problematicOrgs: string[] = [];
  for (const membership of userMemberships) {
    const [ownerCount] = await db
      .select({ count: count() })
      .from(orgMemberships)
      .where(
        and(
          eq(orgMemberships.organizationId, membership.organizationId),
          eq(orgMemberships.role, ORG_ROLES.OWNER)
        )
      );

    if (ownerCount.count <= 1) {
      problematicOrgs.push(membership.organizationName);
    }
  }

  if (problematicOrgs.length > 0) {
    throw new Error(
      `Cannot delete user: they are the sole owner of ${problematicOrgs.length} organization(s): ${problematicOrgs.join(', ')}. Transfer ownership first.`,
      { cause: ERRORS.FORBIDDEN }
    );
  }
}
