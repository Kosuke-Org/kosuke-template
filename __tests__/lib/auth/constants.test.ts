import { AUTH_ROUTES, PUBLIC_ROUTES, AUTH_ERRORS, SYNC_INTERVALS } from '@/lib/auth/constants';

describe('Auth Constants', () => {
  describe('AUTH_ROUTES', () => {
    it('should define all required authentication routes', () => {
      expect(AUTH_ROUTES).toHaveProperty('SIGN_IN');
      expect(AUTH_ROUTES).toHaveProperty('SIGN_UP');
      expect(AUTH_ROUTES).toHaveProperty('DASHBOARD');
      expect(AUTH_ROUTES).toHaveProperty('HOME');
      expect(AUTH_ROUTES).toHaveProperty('SETTINGS');

      expect(typeof AUTH_ROUTES.SIGN_IN).toBe('string');
      expect(typeof AUTH_ROUTES.SIGN_UP).toBe('string');
      expect(typeof AUTH_ROUTES.DASHBOARD).toBe('string');
      expect(typeof AUTH_ROUTES.HOME).toBe('string');
      expect(typeof AUTH_ROUTES.SETTINGS).toBe('string');
    });

    it('should have valid route paths', () => {
      Object.values(AUTH_ROUTES).forEach((route) => {
        expect(route).toMatch(/^\/[\w-\/]*$/);
      });
    });
  });

  describe('PUBLIC_ROUTES', () => {
    it('should define public routes array', () => {
      expect(Array.isArray(PUBLIC_ROUTES)).toBe(true);
      expect(PUBLIC_ROUTES.length).toBeGreaterThan(0);
    });

    it('should contain root route', () => {
      expect(PUBLIC_ROUTES).toContain('/');
    });

    it('should contain home route', () => {
      expect(PUBLIC_ROUTES).toContain('/home');
    });
  });

  describe('AUTH_ERRORS', () => {
    it('should define error message constants', () => {
      expect(AUTH_ERRORS).toHaveProperty('USER_NOT_FOUND');
      expect(typeof AUTH_ERRORS.USER_NOT_FOUND).toBe('string');
      expect(AUTH_ERRORS.USER_NOT_FOUND.length).toBeGreaterThan(0);
    });
  });

  describe('SYNC_INTERVALS', () => {
    it('should define sync configuration', () => {
      expect(SYNC_INTERVALS).toHaveProperty('STALE_THRESHOLD_HOURS');
      expect(SYNC_INTERVALS).toHaveProperty('WEBHOOK_RETRY_DELAY_MS');
      expect(SYNC_INTERVALS).toHaveProperty('MAX_RETRY_ATTEMPTS');

      expect(typeof SYNC_INTERVALS.STALE_THRESHOLD_HOURS).toBe('number');
      expect(typeof SYNC_INTERVALS.WEBHOOK_RETRY_DELAY_MS).toBe('number');
      expect(typeof SYNC_INTERVALS.MAX_RETRY_ATTEMPTS).toBe('number');
    });

    it('should have reasonable sync values', () => {
      expect(SYNC_INTERVALS.STALE_THRESHOLD_HOURS).toBeGreaterThan(0);
      expect(SYNC_INTERVALS.WEBHOOK_RETRY_DELAY_MS).toBeGreaterThan(0);
      expect(SYNC_INTERVALS.MAX_RETRY_ATTEMPTS).toBeGreaterThan(0);
    });
  });
});
