import Stripe from 'stripe';

/**
 * Centralized Stripe client configuration
 * Single source of truth for all Stripe API interactions
 */

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

/**
 * Re-export Stripe types for convenience
 */
export type { Stripe };
