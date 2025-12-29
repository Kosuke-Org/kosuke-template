// Route Constants
export const AUTH_ROUTES = {
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  ONBOARDING: '/onboarding',
  HOME: '/home',
  SETTINGS: '/settings',
  ROOT: '/',
  VERIFY_OTP: '/sign-in/verify',
  VERIFY_EMAIL: '/sign-up/verify-email-address',
} as const;

// Error Messages
export const AUTH_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized',
} as const;

export const TEST_EMAIL_SUFFIX = '+kosuke_test@example.com';
export const TEST_OTP = '424242';
