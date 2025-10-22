// Main auth functionality exports
export { syncUserFromClerk, syncUserFromWebhook, getUserByClerkId } from './user-sync';

// Auth utilities
export { isValidEmail } from './utils';

// Types - Re-export from centralized types
export type {
  ClerkUserType,
  ClerkWebhookUser,
  LocalUser,
  UserSyncResult,
  AuthState,
  UserSyncOptions,
} from '@/lib/types';

export { ActivityType } from '@/lib/db/schema';

// Constants
export { AUTH_ROUTES } from './constants';
