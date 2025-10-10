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
  isValidEmail,
  getDisplayName,
  getUserEmail,
  createActivityLogData,
  isAuthenticated,
} from './utils';

// Types - Re-export from centralized types
export type {
  ClerkUserType,
  ClerkWebhookUser,
  LocalUser,
  UserSyncResult,
  AuthState,
  UserSyncOptions,
  UserSyncResponse,
} from '@/lib/types';

export { ActivityType } from '@/lib/db/schema';

// Constants
export { SYNC_INTERVALS, AUTH_ROUTES, AUTH_ERRORS } from './constants';
