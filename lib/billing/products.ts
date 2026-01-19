/**
 * Product configuration derived from products.json
 * This is the single source of truth for subscription tiers and product definitions
 *
 * IMPORTANT: The system uses lookup keys as the primary identifier.
 * - Database stores UNPREFIXED lookup keys (e.g., 'free_monthly', 'pro_monthly') in the 'tier' column
 * - Stripe API uses PREFIXED lookup keys (e.g., 'project123_free_monthly') for multi-tenant isolation
 * - This allows supporting multiple billing intervals per tier
 *
 * TIER HIERARCHY: Each product has an explicit 'tierLevel' field that defines access permissions.
 * - tierLevel 0 = lowest tier (e.g., free)
 * - tierLevel 1 = medium tier (e.g., pro)
 * - tierLevel 2 = higher tier (e.g., business)
 * - hasFeatureAccess() compares tierLevel values to determine access
 * - Products can be reordered in the array without breaking access logic
 * - If tierLevel is missing, falls back to array index for backward compatibility
 * - Multiple products can share the same tierLevel (e.g., pro_monthly and pro_yearly)
 *
 * MULTI-TENANT SUPPORT:
 * - For sandboxes/staging: Uses KOSUKE_PROJECT_ID as prefix to avoid collisions in shared Stripe test account
 * - For production: No prefix (BYOK - each user has their own Stripe account)
 */
import productsConfig from './products.json';

/**
 * Explicit subscription tier constants for type safety and clarity.
 * These are UNPREFIXED base keys used in code and stored in database.
 *
 * IMPORTANT: When adding a new tier to products.json, update this enum manually.
 * This explicit approach is preferred over dynamic generation for:
 * - Better IDE autocomplete and type checking
 * - Clearer code for LLM-generated modifications
 * - Intentional, visible updates when adding new tiers
 * - Easier code review and maintenance
 */
export const SubscriptionTier = {
  FREE_MONTHLY: 'free_monthly',
  PRO_MONTHLY: 'pro_monthly',
  BUSINESS_MONTHLY: 'business_monthly',
} as const;

// Type for subscription tiers (unprefixed base lookup keys)
export type SubscriptionTierType = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

/**
 * Get all available lookup keys (unprefixed base keys)
 * For Stripe API calls, use getAllPrefixedLookupKeys() from lookup-keys.ts
 */
export function getAllLookupKeys(): string[] {
  return productsConfig.products.map((p) => p.lookupKey);
}
