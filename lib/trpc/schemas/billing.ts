import { z } from 'zod';

/**
 * Client-safe Zod schemas for billing operations
 * NO server dependencies - only Zod imports allowed
 */

const subscriptionTierSchema = z.enum(['pro', 'business']);

export const createCheckoutSchema = z.object({
  tier: subscriptionTierSchema,
  redirectUrl: z.string().optional(),
});

export const syncActionSchema = z.object({
  action: z.enum(['user', 'stale', 'emergency']).default('user'),
});
