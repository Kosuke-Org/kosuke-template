/**
 * Billing configuration and constants
 * Contains price mappings, pricing information, and billing-related constants
 */

// Price ID mapping for Stripe prices
export const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID!,
  business: process.env.STRIPE_BUSINESS_PRICE_ID!,
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
  success: process.env.STRIPE_SUCCESS_URL!,
  cancel: process.env.STRIPE_CANCEL_URL!,
} as const;
