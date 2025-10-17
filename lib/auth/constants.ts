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
  UNAUTHORIZED: 'UNAUTHORIZED',
  SYNC_FAILED: 'Failed to sync user data',
  INVALID_WEBHOOK: 'Invalid webhook signature',
  MISSING_HEADERS: 'Missing required headers',
  CONFIGURATION_ERROR: 'Configuration error',
} as const;
