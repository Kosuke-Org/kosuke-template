import { ClerkUserType, ClerkWebhookUser, AuthState } from '@/lib/types';
import { ActivityType } from '@/lib/db/schema';

/**
 * Extract user data from Clerk API user object
 */
export function extractUserData(clerkUser: ClerkUserType) {
  // Prioritize custom uploaded image over Clerk's default avatar
  const customImageUrl = clerkUser.publicMetadata?.customProfileImageUrl as string | undefined;

  return {
    clerkUserId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    displayName: clerkUser.fullName || clerkUser.firstName || null,
    profileImageUrl: customImageUrl || null, // Use custom image or null (don't use Clerk's default)
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Extract user data from Clerk webhook user object
 */
export function extractUserDataFromWebhook(webhookUser: ClerkWebhookUser) {
  // Prioritize custom uploaded image over Clerk's default avatar
  const metadata = webhookUser.public_metadata as Record<string, unknown> | undefined;
  const customImageUrl = metadata?.customProfileImageUrl as string | undefined;

  return {
    clerkUserId: webhookUser.id,
    email: webhookUser.email_addresses?.[0]?.email_address || '',
    displayName:
      webhookUser.first_name && webhookUser.last_name
        ? `${webhookUser.first_name} ${webhookUser.last_name}`.trim()
        : webhookUser.first_name || null,
    profileImageUrl: customImageUrl || null, // Use custom image or null (don't use Clerk's default)
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Check if user has changes that need syncing
 */
export function hasUserChanges(
  existing: { email: string; displayName: string | null; profileImageUrl: string | null },
  newData: { email: string; displayName: string | null; profileImageUrl: string | null }
): boolean {
  return (
    existing.email !== newData.email ||
    existing.displayName !== newData.displayName ||
    existing.profileImageUrl !== newData.profileImageUrl
  );
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get display name from user object
 */
export function getDisplayName(user: ClerkUserType | ClerkWebhookUser): string {
  if ('fullName' in user) {
    return (user.fullName || user.firstName || 'User') as string;
  }

  // Webhook user object
  const webhookUser = user as ClerkWebhookUser;
  if (webhookUser.first_name && webhookUser.last_name) {
    return `${webhookUser.first_name} ${webhookUser.last_name}`.trim();
  }

  return webhookUser.first_name || 'User';
}

/**
 * Get email from user object
 */
export function getUserEmail(user: ClerkUserType | ClerkWebhookUser): string {
  if ('emailAddresses' in user && user.emailAddresses) {
    return (user.emailAddresses as Array<{ emailAddress: string }>)[0]?.emailAddress || '';
  }

  // Webhook user object
  const webhookUser = user as ClerkWebhookUser;
  return webhookUser.email_addresses?.[0]?.email_address || '';
}

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

/**
 * Type guard to check if auth state is authenticated
 */
export function isAuthenticated(authState: AuthState): authState is AuthState & {
  isAuthenticated: true;
  user: ClerkUserType;
  localUser: NonNullable<AuthState['localUser']>;
} {
  return authState.isAuthenticated && authState.user !== null && authState.localUser !== null;
}
