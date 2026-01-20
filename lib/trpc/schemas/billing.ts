import { z } from 'zod';

import { SubscriptionTier } from '@/lib/billing/products';

/**
 * Client-safe Zod schemas for billing operations
 * Uses SubscriptionTier constants to stay in sync with products.json
 */

const subscriptionTierSchema = z.enum([
  SubscriptionTier.FREE_MONTHLY,
  SubscriptionTier.PRO_MONTHLY,
  SubscriptionTier.BUSINESS_MONTHLY,
]);

export const createCheckoutSchema = z.object({
  tier: subscriptionTierSchema,
  redirectUrl: z.string().optional(),
});

export const syncActionSchema = z.object({
  action: z.enum(['user', 'stale', 'emergency']).default('user'),
});

export const getStatusSchema = z.object({
  organizationId: z.string(),
});

export const canSubscribeSchema = z.object({
  organizationId: z.string(),
});

export const getPricingSchema = z.object({
  organizationId: z.string(),
});
