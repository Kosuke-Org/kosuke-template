import * as billing from '@/lib/billing';

describe('billing index', () => {
  it('should export all billing functions', () => {
    expect(billing).toHaveProperty('getUserSubscription');
    expect(billing).toHaveProperty('getSubscriptionEligibility');
    expect(billing).toHaveProperty('createCheckoutSession');
    expect(billing).toHaveProperty('cancelUserSubscription');
    expect(billing).toHaveProperty('reactivateUserSubscription');
    expect(billing).toHaveProperty('polar');
    expect(billing).toHaveProperty('PRODUCT_IDS');
    expect(billing).toHaveProperty('PRICING');
  });

  it('should export functions as functions', () => {
    expect(typeof billing.getUserSubscription).toBe('function');
    expect(typeof billing.getSubscriptionEligibility).toBe('function');
    expect(typeof billing.createCheckoutSession).toBe('function');
    expect(typeof billing.cancelUserSubscription).toBe('function');
    expect(typeof billing.reactivateUserSubscription).toBe('function');
  });

  it('should export configuration objects', () => {
    expect(typeof billing.PRODUCT_IDS).toBe('object');
    expect(typeof billing.PRICING).toBe('object');
    expect(billing.PRODUCT_IDS).toBeDefined();
    expect(billing.PRICING).toBeDefined();
  });
});
