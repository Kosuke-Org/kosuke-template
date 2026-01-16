/**
 * Billing configuration and constants
 * All product/pricing configuration now comes from products.json
 */

/**
 * Type for pricing data structure
 */
interface PricingTier {
  price: number;
  name: string;
  description: string;
  features: {
    name: string;
  }[];
  priceId: string;
  productId: string;
  lookupKey: string;
}

export type PricingData = Record<string, PricingTier>;

// Billing-related URLs and endpoints
export const BILLING_URLS = {
  success: process.env.STRIPE_SUCCESS_URL!,
  cancel: process.env.STRIPE_CANCEL_URL!,
} as const;
