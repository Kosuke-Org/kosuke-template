import { PRODUCT_IDS, BILLING_URLS, TIER_HIERARCHY } from '@/lib/billing/config';

describe('Billing Config', () => {
  describe('PRODUCT_IDS', () => {
    it('should have product IDs for all tiers', () => {
      expect(PRODUCT_IDS).toHaveProperty('pro');
      expect(PRODUCT_IDS).toHaveProperty('premium');

      expect(typeof PRODUCT_IDS.pro).toBe('string');
      expect(typeof PRODUCT_IDS.premium).toBe('string');

      expect(PRODUCT_IDS.pro).toBeTruthy();
      expect(PRODUCT_IDS.premium).toBeTruthy();
    });

    it('should have unique product IDs', () => {
      const productIds = Object.values(PRODUCT_IDS);
      const uniqueIds = new Set(productIds);
      expect(uniqueIds.size).toBe(productIds.length);
    });
  });

  describe('BILLING_URLS', () => {
    it('should have all required URLs', () => {
      expect(BILLING_URLS).toHaveProperty('success');
      expect(BILLING_URLS).toHaveProperty('cancel');

      expect(typeof BILLING_URLS.success).toBe('string');
      expect(typeof BILLING_URLS.cancel).toBe('string');
    });

    it('should have valid URL formats', () => {
      Object.values(BILLING_URLS).forEach((url) => {
        expect(url).toMatch(/^\/|^https?:\/\//);
      });
    });
  });

  describe('TIER_HIERARCHY', () => {
    it('should define tier order correctly', () => {
      expect(TIER_HIERARCHY).toContain('free');
      expect(TIER_HIERARCHY).toContain('pro');
      expect(TIER_HIERARCHY).toContain('premium');

      expect(TIER_HIERARCHY.indexOf('free')).toBeLessThan(TIER_HIERARCHY.indexOf('pro'));
      expect(TIER_HIERARCHY.indexOf('pro')).toBeLessThan(TIER_HIERARCHY.indexOf('premium'));
    });

    it('should have all tiers unique', () => {
      const uniqueTiers = new Set(TIER_HIERARCHY);
      expect(uniqueTiers.size).toBe(TIER_HIERARCHY.length);
    });
  });
});
