import Stripe from 'stripe';

import { getConfigOrEnv } from '@/lib/services/config-service';
import { CONFIG_KEYS } from '@/lib/services/constants';

/**
 * Centralized Stripe client configuration
 * Single source of truth for all Stripe API interactions
 *
 * Lazy initialization - only throws error when actually used.
 * This allows the app to run without Stripe configured (free tier only).
 * Users must provide their own STRIPE_SECRET_KEY to enable billing features.
 *
 * The Stripe API key is checked in two places (priority order):
 * 1. Database (system_config table) - for BYOK (Bring Your Own Key) pattern
 * 2. Environment variable - fallback for traditional .env configuration
 */

let stripeClient: Stripe | null = null;
let initPromise: Promise<Stripe> | null = null;

/**
 * Get initialized Stripe client
 * Automatically checks database and environment for API key
 *
 * @returns Promise<Stripe> - Initialized Stripe client
 * @throws Error if STRIPE_SECRET_KEY is not configured
 *
 * @example
 * const stripe = await getStripe();
 * const customer = await stripe.customers.create({ email: '...' });
 * const event = await stripe.webhooks.constructEventAsync(...);
 */
export async function getStripe(): Promise<Stripe> {
  if (stripeClient) {
    return stripeClient;
  }

  // Cache the initialization promise to avoid duplicate DB queries
  if (!initPromise) {
    initPromise = (async () => {
      const apiKey = await getConfigOrEnv(CONFIG_KEYS.STRIPE_SECRET_KEY);

      if (!apiKey) {
        throw new Error(
          'STRIPE_SECRET_KEY is required. Configure it via:\n' +
            '1. Admin panel (System → API Keys)\n' +
            '2. Environment variable (STRIPE_SECRET_KEY)'
        );
      }

      stripeClient = new Stripe(apiKey, {
        apiVersion: '2025-12-15.clover',
        typescript: true,
      });

      return stripeClient;
    })();
  }

  return initPromise;
}
