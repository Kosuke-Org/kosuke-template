import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ClerkUserType, ClerkWebhookUser, AuthState } from '@/lib/types';
import { ActivityType } from '@/lib/db/schema';
import { AUTH_ROUTES, SYNC_INTERVALS } from './constants';

/**
 * Check if user sync is stale (older than 24 hours)
 */
export function isSyncStale(lastSyncedAt: Date): boolean {
  const threshold = new Date(Date.now() - SYNC_INTERVALS.STALE_THRESHOLD_HOURS * 60 * 60 * 1000);
  return lastSyncedAt < threshold;
}

/**
 * Get user initials for avatar fallback
 */
export function getUserInitials(user: ClerkUserType | null): string {
  if (!user?.fullName && !user?.firstName) return 'U';
  const name = user?.fullName || user?.firstName || '';
  return name
    .split(' ')
    .map((part: string) => part[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Extract user data from Clerk API user object
 */
export function extractUserData(clerkUser: ClerkUserType) {
  return {
    clerkUserId: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress || '',
    displayName: clerkUser.fullName || clerkUser.firstName || null,
    profileImageUrl: clerkUser.imageUrl || null,
    lastSyncedAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Extract user data from Clerk webhook user object
 */
export function extractUserDataFromWebhook(webhookUser: ClerkWebhookUser) {
  return {
    clerkUserId: webhookUser.id,
    email: webhookUser.email_addresses?.[0]?.email_address || '',
    displayName:
      webhookUser.first_name && webhookUser.last_name
        ? `${webhookUser.first_name} ${webhookUser.last_name}`.trim()
        : webhookUser.first_name || null,
    profileImageUrl: webhookUser.image_url || null,
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
 * Server-side auth guard that redirects unauthenticated users
 */
export async function requireAuth() {
  const { userId } = await auth();

  if (!userId) {
    redirect(AUTH_ROUTES.SIGN_IN);
  }

  return userId;
}

/**
 * Server-side auth check that returns user ID or null
 */
export async function getAuthUser() {
  const { userId } = await auth();
  return userId;
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

/**
 * Generate a safe redirect URL
 */
export function createSafeRedirectUrl(baseUrl: string, redirectPath?: string): string {
  try {
    const url = new URL(baseUrl);
    if (redirectPath && redirectPath.startsWith('/')) {
      url.searchParams.set('redirect_url', redirectPath);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}
