import { describe, expect, it } from 'vitest';

import { getAllLookupKeys, getTierNameFromLookupKey } from '@/lib/billing/products';

describe('Products Configuration', () => {
  describe('getTierNameFromLookupKey', () => {
    it('should extract tier name from lookup key', () => {
      expect(getTierNameFromLookupKey('free_monthly')).toBe('free');
      expect(getTierNameFromLookupKey('pro_monthly')).toBe('pro');
      expect(getTierNameFromLookupKey('business_monthly')).toBe('business');
    });

    it('should handle yearly intervals', () => {
      expect(getTierNameFromLookupKey('pro_yearly')).toBe('pro');
    });
  });

  describe('getAllLookupKeys', () => {
    it('should return all lookup keys from products.json', () => {
      const keys = getAllLookupKeys();
      expect(keys).toContain('free_monthly');
      expect(keys).toContain('pro_monthly');
      expect(keys).toContain('business_monthly');
    });
  });
});
