// Main auth functionality exports
export {
  syncUserFromClerk,
  syncUserFromWebhook,
  getUserByClerkId,
  logUserActivity,
  ensureUserSynced,
  bulkSyncUsers,
  getSyncStats,
} from './user-sync';

// Auth utilities
export {
  isSyncStale,
  getUserInitials,
  extractUserData,
  extractUserDataFromWebhook,
  hasUserChanges,
  requireAuth,
  getAuthUser,
  isValidEmail,
  getDisplayName,
  getUserEmail,
  createActivityLogData,
  isAuthenticated,
  createSafeRedirectUrl,
} from './utils';

// Types
export type {
  ClerkUser,
  ClerkWebhookUser,
  ClerkWebhookEvent,
  LocalUser,
  UserSyncResult,
  AuthState,
  ActivityLogEntry,
  SyncOptions,
  SyncResult,
} from './types';

export { ActivityType } from './types';

// Constants
export {
  SYNC_INTERVALS,
  AUTH_ROUTES,
  PUBLIC_ROUTES,
  AUTH_ERRORS,
  ACTIVITY_TYPES,
  EMAIL_SUBJECTS,
} from './constants';
