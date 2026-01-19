/**
 * Lookup Key Prefix Management
 *
 * Handles prefixing of Stripe lookup keys for multi-tenant test environments.
 * This allows multiple projects/sandboxes to share the same Stripe test account
 * without product/price collisions.
 *
 * Key Principle:
 * - Stripe API calls: Use prefixed lookup keys (e.g., "project123_free_monthly")
 * - Database & metadata: Store unprefixed base keys (e.g., "free_monthly")
 *
 * Environment Variables:
 * - KOSUKE_PROJECT_ID: Optional project identifier used as prefix for multi-tenant environments
 *
 */
import productsConfig from './products.json';

/**
 * Get the product prefix from environment
 * Returns null if no prefix configured
 *
 */
export function getProductPrefix(): string | null {
  return process.env.KOSUKE_PROJECT_ID || null;
}

/**
 * Add prefix to lookup key if configured
 * Example: "free_monthly" -> "project123_free_monthly"
 */
export function withPrefix(lookupKey: string): string {
  const prefix = getProductPrefix();
  return prefix ? `${prefix}_${lookupKey}` : lookupKey;
}

/**
 * Remove prefix from lookup key to get base key
 * Example: "project123_free_monthly" -> "free_monthly"
 */
export function stripPrefix(prefixedKey: string): string {
  const prefix = getProductPrefix();
  if (!prefix) return prefixedKey;

  const expectedPrefix = `${prefix}_`;
  if (prefixedKey.startsWith(expectedPrefix)) {
    return prefixedKey.substring(expectedPrefix.length);
  }
  return prefixedKey;
}

/**
 * Get all lookup keys from products.json (unprefixed base keys)
 */
export function getAllBaseLookupKeys(): string[] {
  return productsConfig.products.map((p) => p.lookupKey);
}

/**
 * Get all lookup keys with prefix applied (for Stripe API calls)
 */
export function getAllPrefixedLookupKeys(): string[] {
  const baseKeys = getAllBaseLookupKeys();
  const prefix = getProductPrefix();

  if (!prefix) return baseKeys;
  return baseKeys.map((key) => `${prefix}_${key}`);
}
