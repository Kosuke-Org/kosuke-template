import { createActivityLogData } from '@/lib/auth/utils';
import { ActivityType } from '@/lib/db/schema';
import { vi } from 'vitest';

vi.mock('next/navigation');

describe('Auth Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createActivityLogData', () => {
    it('should create activity log data with all parameters', () => {
      const metadata = { action: 'test' };
      const result = createActivityLogData(
        'user_123',
        ActivityType.SIGN_IN,
        metadata,
        '192.168.1.1'
      );

      expect(result).toEqual({
        userId: 'user_123',
        action: ActivityType.SIGN_IN,
        metadata: JSON.stringify(metadata),
        ipAddress: '192.168.1.1',
        timestamp: expect.any(Date),
      });
    });

    it('should create activity log data with minimal parameters', () => {
      const result = createActivityLogData('user_123', ActivityType.SIGN_OUT);

      expect(result).toEqual({
        userId: 'user_123',
        action: ActivityType.SIGN_OUT,
        metadata: null,
        ipAddress: null,
        timestamp: expect.any(Date),
      });
    });
  });
});
