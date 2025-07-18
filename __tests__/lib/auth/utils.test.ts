import { isSyncStale } from '@/lib/auth/utils';

describe('Auth Utils', () => {
  describe('isSyncStale', () => {
    it('should return true for dates older than 24 hours', () => {
      const staleDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
      expect(isSyncStale(staleDate)).toBe(true);
    });

    it('should return false for recent dates', () => {
      const recentDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      expect(isSyncStale(recentDate)).toBe(false);
    });

    it('should return false for dates exactly at 24 hours', () => {
      const exactDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Exactly 24 hours ago
      expect(isSyncStale(exactDate)).toBe(false);
    });

    it('should handle current time', () => {
      const now = new Date();
      expect(isSyncStale(now)).toBe(false);
    });

    it('should handle far past dates', () => {
      const farPast = new Date('2020-01-01');
      expect(isSyncStale(farPast)).toBe(true);
    });
  });
});
