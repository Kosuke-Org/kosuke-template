// Sync Constants
export const SYNC_INTERVALS = {
  STALE_THRESHOLD_HOURS: 24,
  WEBHOOK_RETRY_DELAY_MS: 1000,
  MAX_RETRY_ATTEMPTS: 3,
} as const;

// Route Constants
export const AUTH_ROUTES = {
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  HOME: '/home',
  SETTINGS: '/settings',
} as const;

// Public Routes (routes that don't require authentication)
export const PUBLIC_ROUTES = [
  '/',
  '/home',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/billing/webhook',
  '/api/clerk/webhook',
  '/api/webhooks(.*)',
] as const;

// Error Messages
export const AUTH_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized',
  SYNC_FAILED: 'Failed to sync user data',
  INVALID_WEBHOOK: 'Invalid webhook signature',
  MISSING_HEADERS: 'Missing required headers',
  CONFIGURATION_ERROR: 'Configuration error',
} as const;

// Activity Types for consistency
export const ACTIVITY_TYPES = {
  SIGN_UP: 'sign_up',
  SIGN_IN: 'sign_in',
  SIGN_OUT: 'sign_out',
  UPDATE_ACCOUNT: 'update_account',
  DELETE_ACCOUNT: 'delete_account',
  PROFILE_IMAGE_UPDATED: 'profile_image_updated',
} as const;

// Email Templates
export const EMAIL_SUBJECTS = {
  WELCOME: 'Welcome to Kosuke Template! 🎉',
  ACCOUNT_UPDATED: 'Your account has been updated',
  ACCOUNT_DELETED: 'Your account has been deleted',
} as const;
