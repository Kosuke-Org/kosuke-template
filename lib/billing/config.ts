/**
 * Billing configuration and constants
 * Contains product mappings, pricing information, and billing-related constants
 */

// Product ID mapping for Polar products
export const PRODUCT_IDS = {
  pro: process.env.POLAR_PRO_PRODUCT_ID!,
  business: process.env.POLAR_BUSINESS_PRODUCT_ID!,
} as const;

// Pricing information for all tiers
export const PRICING = {
  free: {
    price: 0,
    name: 'Free',
    description: 'Perfect for getting started',
    features: ['Basic features', 'Community support', 'Limited usage'],
  },
  pro: {
    price: 20,
    name: 'Pro',
    description: 'For growing teams',
    features: ['All free features', 'Priority support', 'Advanced features', 'Higher usage limits'],
  },
  business: {
    price: 200,
    name: 'Business',
    description: 'For large organizations',
    features: ['All pro features', 'Enterprise support', 'Custom integrations', 'Unlimited usage'],
  },
} as const;

// Billing-related URLs and endpoints
export const BILLING_URLS = {
  success: process.env.POLAR_SUCCESS_URL!,
} as const;
