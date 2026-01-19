/**
 * Billing Module - Main Exports
 *
 * Provides a clean public API for the billing system
 * Import from here to access all billing functionality
 */

// Core functionality
export {
  getOrgSubscription,
  hasFeatureAccess,
  safeSubscriptionTierCast,
  safeSubscriptionStatusCast,
} from './subscription';

// Business logic and eligibility
export { calculateSubscriptionState, getSubscriptionEligibility } from './eligibility';

// Operations
export {
  createCheckoutSession,
  cancelOrgSubscription,
  reactivateOrgSubscription,
  createCustomerPortalSession,
  cancelPendingDowngrade,
  getPricingFromStripe,
  createFreeTierSubscription,
  deleteStripeCustomer,
} from './operations';

// Configuration and constants
export { BILLING_URLS } from './config';
export type { PricingData } from './config';

// Products configuration (single source of truth)
export { SubscriptionTier, getAllLookupKeys } from './products';
export type { SubscriptionTierType } from './products';

// Lookup key helpers (for multi-tenant support)
export {
  getProductPrefix,
  withPrefix,
  stripPrefix,
  getAllPrefixedLookupKeys,
  getAllBaseLookupKeys,
} from './lookup-keys';

// Client and types
export { stripe } from './client';
export type {
  SubscriptionEligibility,
  OrgSubscriptionInfo,
  CheckoutSessionParams,
  OperationResult,
} from '@/lib/types';
export { SubscriptionStatus } from '@/lib/db/schema';
export { SubscriptionState } from '@/lib/types';

// All functions are exported above with their original names for backward compatibility
