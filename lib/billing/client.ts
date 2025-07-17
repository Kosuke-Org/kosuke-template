import { Polar } from '@polar-sh/sdk';

/**
 * Centralized Polar client configuration
 * Single source of truth for all Polar API interactions
 */

// Initialize Polar client with environment-based configuration
export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: process.env.POLAR_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production',
});

/**
 * Re-export Polar types for convenience
 */
export type { Polar } from '@polar-sh/sdk';
