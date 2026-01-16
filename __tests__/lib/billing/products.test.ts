import { describe, expect, it } from 'vitest';

import { getAllLookupKeys } from '@/lib/billing/products';

describe('Products Configuration', () => {
  describe('getAllLookupKeys', () => {
    it('should return all lookup keys from products.json', () => {
      const keys = getAllLookupKeys();
      expect(keys).toContain('free_monthly');
      expect(keys).toContain('pro_monthly');
      expect(keys).toContain('business_monthly');
    });
  });
});
