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
  ONBOARDING: '/onboarding',
  HOME: '/home',
  SETTINGS: '/settings',
} as const;

// Error Messages
export const AUTH_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized',
  SYNC_FAILED: 'Failed to sync user data',
  INVALID_WEBHOOK: 'Invalid webhook signature',
  MISSING_HEADERS: 'Missing required headers',
  CONFIGURATION_ERROR: 'Configuration error',
} as const;
