/**
 * Product configuration derived from products.json
 * This is the single source of truth for subscription tiers and product definitions
 *
 * IMPORTANT: The system uses lookup keys as the primary identifier.
 * - Database stores lookup keys (e.g., 'free_monthly', 'pro_monthly') in the 'tier' column
 * - Lookup keys map directly to Stripe prices (no translation layer)
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
 */
import productsConfig from './products.json';

/**
 * Explicit subscription tier constants for type safety and clarity.
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

// Type for subscription tiers (lookup keys)
export type SubscriptionTierType = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

export function getTierNameFromLookupKey(lookupKey: string | undefined | null): string {
  if (!lookupKey) {
    return 'free';
  }
  const parts = lookupKey.split('_');
  return parts.slice(0, -1).join('_');
}

// Helper to get all available lookup keys
export function getAllLookupKeys(): string[] {
  return productsConfig.products.map((p) => p.lookupKey);
}
