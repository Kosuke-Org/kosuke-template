/**
 * Billing Module - Main Exports
 *
 * Provides a clean public API for the billing system
 * Import from here to access all billing functionality
 */

// Core functionality
export {
  getUserSubscription,
  hasFeatureAccess,
  safeSubscriptionTierCast,
  safeSubscriptionStatusCast,
} from './subscription';

// Business logic and eligibility
export {
  calculateSubscriptionState,
  getSubscriptionEligibility,
  getTierInfo,
  getAvailableTiers,
} from './eligibility';

// Operations
export {
  createCheckoutSession,
  cancelUserSubscription,
  reactivateUserSubscription,
  createCustomerPortalSession,
  cancelPendingDowngrade,
} from './operations';

// Configuration and constants
export { PRICE_IDS, PRICING, BILLING_URLS } from './config';

// Client and types
export { stripe } from './client';
export type {
  SubscriptionEligibility,
  UserSubscriptionInfo,
  CheckoutSessionParams,
  OperationResult,
} from '@/lib/types';
export { SubscriptionTier, SubscriptionStatus } from '@/lib/db/schema';
export { SubscriptionState } from '@/lib/types';

// All functions are exported above with their original names for backward compatibility
