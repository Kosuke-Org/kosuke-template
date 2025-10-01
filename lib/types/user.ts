import type { User } from '@/lib/db/schema';
import type { User as ClerkUser } from '@clerk/nextjs/server';

// Base types extending schema
export type { User, ActivityType } from '@/lib/db/schema';

// Clerk User Types (migrated from lib/auth/types.ts)
export type ClerkUserType = ClerkUser;

export interface ClerkWebhookUser {
  id: string;
  email_addresses?: Array<{ email_address: string }>;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  [key: string]: unknown;
}

export interface ClerkWebhookEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted';
  data: ClerkWebhookUser;
}

// Local User Types (migrated from lib/auth/types.ts)
export interface LocalUser {
  id: string;
  clerkUserId: string;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSyncResult {
  id: string;
  clerkUserId: string;
  wasUpdated?: boolean;
}

// Auth State Types (migrated from lib/auth/types.ts)
export interface AuthState {
  isAuthenticated: boolean;
  user: ClerkUserType | null;
  localUser: LocalUser | null;
  isLoading: boolean;
}

// Activity Log Types (migrated from lib/auth/types.ts)
export interface ActivityLogEntry {
  clerkUserId: string;
  action: import('@/lib/db/schema').ActivityType;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp?: Date;
}

// Sync Types (migrated from lib/auth/types.ts)
export interface UserSyncOptions {
  forceSync?: boolean;
  includeActivity?: boolean;
}

export interface UserSyncResponse {
  success: boolean;
  user?: UserSyncResult;
  error?: string;
  wasUpdated?: boolean;
}

// Extended user types for different use cases
export interface UserWithSubscription extends User {
  subscription?: {
    tier: string;
    status: string;
    currentPeriodEnd: Date | null;
  };
}

export interface UserProfile
  extends Pick<User, 'id' | 'clerkUserId' | 'email' | 'displayName' | 'profileImageUrl'> {
  isActive: boolean;
  lastSeenAt?: Date;
}

export interface UserListItem
  extends Pick<User, 'id' | 'clerkUserId' | 'displayName' | 'profileImageUrl' | 'createdAt'> {
  subscriptionTier: string;
}

// User operation types
export interface CreateUserData extends Pick<User, 'clerkUserId' | 'email'> {
  displayName?: string;
  profileImageUrl?: string;
}

export interface UpdateUserData
  extends Partial<Pick<User, 'email' | 'displayName' | 'profileImageUrl'>> {
  lastSyncedAt?: Date;
}

// User sync types (duplicate removed - already defined above)

export interface UserSyncOptions {
  forceSync?: boolean;
  includeActivity?: boolean;
}

export interface UserSyncResponse {
  success: boolean;
  user?: UserSyncResult;
  error?: string;
}

// User statistics and analytics
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
}

export interface UserActivitySummary {
  signUps: number;
  signIns: number;
  profileUpdates: number;
  subscriptionChanges: number;
  period: 'day' | 'week' | 'month' | 'year';
}

// Auth state types
export interface AuthState {
  isAuthenticated: boolean;
  user: ClerkUserType | null;
  localUser: LocalUser | null;
  isLoading: boolean;
}

// Notification settings types
export interface NotificationSettings {
  emailNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}
