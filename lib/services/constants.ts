/**
 * Configuration keys for type-safe access to system config
 * Values match environment variable names for simplicity
 */
export const CONFIG_KEYS = {
  STRIPE_WEBHOOK_SECRET: 'STRIPE_WEBHOOK_SECRET',
  STRIPE_SECRET_KEY: 'STRIPE_SECRET_KEY',
  STRIPE_PUBLISHABLE_KEY: 'STRIPE_PUBLISHABLE_KEY',
  GOOGLE_AI_API_KEY: 'GOOGLE_AI_API_KEY',
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

export const ERRORS = {
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  BAD_REQUEST: 'Bad request',
} as const;
