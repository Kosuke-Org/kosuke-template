import type { User as ClerkUser } from '@clerk/nextjs/server';

// Base types extending schema
export type { User, ActivityType } from '@/lib/db/schema';

// Clerk User Types
export type ClerkUserType = ClerkUser;

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

// Auth State Types
export interface AuthState {
  isAuthenticated: boolean;
  user: ClerkUserType | null;
  localUser: LocalUser | null;
  isLoading: boolean;
}

// Sync Types
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

// Notification settings types
export interface NotificationSettings {
  emailNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}
