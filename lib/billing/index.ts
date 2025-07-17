/**
 * Billing Module - Main Exports
 *
 * Provides a clean public API for the billing system
 * Import from here to access all billing functionality
 */

// Core functionality
export {
  getUserSubscription,
  updateUserSubscription,
  createFreeSubscription,
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
} from './operations';

// Configuration and constants
export { PRODUCT_IDS, PRICING, BILLING_URLS } from './config';

// Client and types
export { polar } from './client';
export type {
  SubscriptionEligibility,
  UserSubscriptionInfo,
  SubscriptionUpdateParams,
  CheckoutSessionParams,
  OperationResult,
} from './types';
export { SubscriptionState, SubscriptionTier, SubscriptionStatus } from './types';

// All functions are exported above with their original names for backward compatibility
