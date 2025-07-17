import { User } from '@clerk/nextjs/server';

// Clerk User Types
export type ClerkUser = User;

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

// Local User Types
export interface LocalUser {
  id: number;
  clerkUserId: string;
  email: string;
  displayName: string | null;
  profileImageUrl: string | null;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSyncResult {
  id: number;
  clerkUserId: string;
}

// Auth State Types
export interface AuthState {
  isAuthenticated: boolean;
  user: ClerkUser | null;
  localUser: LocalUser | null;
}

// Activity Log Types
export enum ActivityType {
  SIGN_UP = 'sign_up',
  SIGN_IN = 'sign_in',
  SIGN_OUT = 'sign_out',
  UPDATE_ACCOUNT = 'update_account',
  DELETE_ACCOUNT = 'delete_account',
  PROFILE_IMAGE_UPDATED = 'profile_image_updated',
}

export interface ActivityLogEntry {
  clerkUserId: string;
  action: ActivityType;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  timestamp?: Date;
}

// Sync Types
export interface SyncOptions {
  forceSync?: boolean;
  includeActivity?: boolean;
}

export interface SyncResult {
  success: boolean;
  user?: UserSyncResult;
  error?: string;
  wasUpdated?: boolean;
}
