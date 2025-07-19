import { polar } from '@/lib/billing/client';

describe('billing client', () => {
  it('should export polar client instance', () => {
    expect(polar).toBeDefined();
    expect(typeof polar).toBe('object');
  });

  it('should have polar client available', () => {
    expect(polar).toHaveProperty('constructor');
    expect(polar.constructor.name).toBe('Object');
  });
});
