import { z } from 'zod';

/**
 * Client-safe Zod schemas for billing operations
 * NO server dependencies - only Zod imports allowed
 */

export const subscriptionTierSchema = z.enum(['pro', 'business']);

export const createCheckoutSchema = z.object({
  tier: subscriptionTierSchema,
});

export const syncActionSchema = z.object({
  action: z.enum(['user', 'stale', 'emergency']).default('user'),
});

// Type exports for client-side use
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type SyncActionInput = z.infer<typeof syncActionSchema>;
