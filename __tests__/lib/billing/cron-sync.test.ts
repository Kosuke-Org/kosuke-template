import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkSyncHealth, runPeriodicSync } from '@/lib/billing/cron-sync';
import { syncStaleSubscriptions } from '@/lib/billing/stripe-sync';

// Mock stripe-sync module
vi.mock('@/lib/billing/stripe-sync', () => ({
  syncStaleSubscriptions: vi.fn(),
}));

describe('Cron Sync Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('runPeriodicSync', () => {
    it('should sync subscriptions successfully', async () => {
      vi.mocked(syncStaleSubscriptions).mockResolvedValueOnce({
        syncedCount: 5,
        errors: [],
      });

      const result = await runPeriodicSync();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(5);
      expect(result.errorCount).toBe(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should report errors during sync', async () => {
      vi.mocked(syncStaleSubscriptions).mockResolvedValueOnce({
        syncedCount: 3,
        errors: ['Error 1', 'Error 2'],
      });

      const result = await runPeriodicSync();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(3);
      expect(result.errorCount).toBe(2);
    });

    it('should handle complete sync failure', async () => {
      vi.mocked(syncStaleSubscriptions).mockRejectedValueOnce(new Error('Sync failed'));

      const result = await runPeriodicSync();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('checkSyncHealth', () => {
    it('should return healthy status', async () => {
      const result = await checkSyncHealth();

      expect(result.status).toBe('healthy');
      expect(result.timestamp).toBeDefined();
      expect(result.checks).toBeDefined();
      expect(result.checks.database).toBe('ok');
      expect(result.checks.stripeApi).toBe('ok');
    });

    it('should have proper health check structure', async () => {
      const result = await checkSyncHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('checks');
      expect(typeof result.timestamp).toBe('string');
    });
  });
});
