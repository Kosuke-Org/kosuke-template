import { PRODUCT_IDS, BILLING_URLS, PRICING } from '@/lib/billing/config';

describe('Billing Config', () => {
  describe('PRODUCT_IDS', () => {
    it('should have product IDs for all tiers', () => {
      expect(PRODUCT_IDS).toHaveProperty('pro');
      expect(PRODUCT_IDS).toHaveProperty('business');

      expect(typeof PRODUCT_IDS.pro).toBe('string');
      expect(typeof PRODUCT_IDS.business).toBe('string');
    });

    it('should have unique product IDs', () => {
      const productIds = Object.values(PRODUCT_IDS);
      const uniqueIds = new Set(productIds);
      expect(uniqueIds.size).toBe(productIds.length);
    });

    it('should have valid product ID format', () => {
      // Assuming product IDs are UUIDs or similar format
      Object.values(PRODUCT_IDS).forEach((id) => {
        expect(id).toBeTruthy();
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(0);
      });
    });
  });

  describe('BILLING_URLS', () => {
    it('should have success URL', () => {
      expect(BILLING_URLS).toHaveProperty('success');
      expect(typeof BILLING_URLS.success).toBe('string');
      expect(BILLING_URLS.success).toBeTruthy();
    });

    it('should have valid URL format', () => {
      expect(BILLING_URLS.success).toMatch(/^https?:\/\/|^\//);
    });
  });

  describe('PRICING', () => {
    it('should define pricing for all tiers', () => {
      expect(PRICING).toHaveProperty('free');
      expect(PRICING).toHaveProperty('pro');
      expect(PRICING).toHaveProperty('business');
    });

    it('should have correct pricing structure', () => {
      Object.values(PRICING).forEach((tier) => {
        expect(tier).toHaveProperty('price');
        expect(tier).toHaveProperty('name');
        expect(tier).toHaveProperty('description');
        expect(tier).toHaveProperty('features');

        expect(typeof tier.price).toBe('number');
        expect(typeof tier.name).toBe('string');
        expect(typeof tier.description).toBe('string');
        expect(Array.isArray(tier.features)).toBe(true);
      });
    });

    it('should have ascending price order', () => {
      expect(PRICING.free.price).toBeLessThan(PRICING.pro.price);
      expect(PRICING.pro.price).toBeLessThan(PRICING.business.price);
    });

    it('should have free tier with zero price', () => {
      expect(PRICING.free.price).toBe(0);
    });

    it('should have features as non-empty arrays', () => {
      Object.values(PRICING).forEach((tier) => {
        expect(tier.features.length).toBeGreaterThan(0);
        tier.features.forEach((feature) => {
          expect(typeof feature).toBe('string');
          expect(feature.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
