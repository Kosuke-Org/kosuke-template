import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearSignInAttempt,
  createActivityLogData,
  createSignInAttempt,
  getCurrentSignInAttempt,
  isTestEmail,
} from '@/lib/auth/utils';
import { ActivityType } from '@/lib/db/schema';

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

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

  describe('Sign-in Attempt Management', () => {
    describe('createSignInAttempt', () => {
      it('should handle email with special characters', async () => {
        const { cookies } = await import('next/headers');
        const mockSet = vi.fn();
        vi.mocked(cookies).mockResolvedValue({
          set: mockSet,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        const email = 'test+tag@example.com';
        const result = await createSignInAttempt(email);

        expect(result).toBe(email);
        expect(mockSet).toHaveBeenCalledWith('sign_in_attempt_email', email, expect.any(Object));
      });

      it('should create a sign-in attempt cookie with correct settings', async () => {
        const { cookies } = await import('next/headers');

        const mockSet = vi.fn();
        vi.mocked(cookies).mockResolvedValue({
          set: mockSet,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        const email = 'test@example.com';
        const result = await createSignInAttempt(email);

        expect(result).toBe(email);
        expect(mockSet).toHaveBeenCalledWith('sign_in_attempt_email', email, {
          httpOnly: true,
          secure: false, // NODE_ENV !== 'production' in tests
          sameSite: 'none',
          maxAge: 600, // 10 minutes in seconds
          path: '/',
        });
      });

      it('should use secure flag in production', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        const { cookies } = await import('next/headers');

        const mockSet = vi.fn();
        vi.mocked(cookies).mockResolvedValue({
          set: mockSet,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        await createSignInAttempt('test@example.com');

        expect(mockSet).toHaveBeenCalledWith(
          'sign_in_attempt_email',
          'test@example.com',
          expect.objectContaining({
            secure: true,
          })
        );
      });
    });

    describe('getCurrentSignInAttempt', () => {
      it('should return email when sign-in attempt exists', async () => {
        const { cookies } = await import('next/headers');
        const mockGet = vi.fn();
        vi.mocked(cookies).mockResolvedValue({
          get: mockGet.mockReturnValue({ value: 'test@example.com' }),
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        const result = await getCurrentSignInAttempt();

        expect(result).toEqual({ email: 'test@example.com' });
        expect(mockGet).toHaveBeenCalledWith('sign_in_attempt_email');
      });

      it('should return null when sign-in attempt does not exist', async () => {
        const { cookies } = await import('next/headers');
        const mockGet = vi.fn();
        vi.mocked(cookies).mockResolvedValue({
          get: mockGet,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        const result = await getCurrentSignInAttempt();

        expect(result).toBeNull();
      });

      it('should return null when cookie value is empty', async () => {
        const { cookies } = await import('next/headers');
        const mockGet = vi.fn();
        vi.mocked(cookies).mockResolvedValue({
          get: mockGet,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        const result = await getCurrentSignInAttempt();

        expect(result).toBeNull();
      });
    });

    describe('clearSignInAttempt', () => {
      it('should delete the sign-in attempt cookie', async () => {
        const { cookies } = await import('next/headers');
        const mockDelete = vi.fn();
        vi.mocked(cookies).mockResolvedValue({
          delete: mockDelete,
        } as any); // eslint-disable-line @typescript-eslint/no-explicit-any

        await clearSignInAttempt();

        expect(mockDelete).toHaveBeenCalledWith('sign_in_attempt_email');
      });
    });

    describe('isTestEmail', () => {
      describe('in development environment', () => {
        beforeEach(() => {
          vi.stubEnv('NODE_ENV', 'development');
        });

        it('should return true for emails matching seed pattern (+kosuke_test@example.com)', () => {
          expect(isTestEmail('john+kosuke_test@example.com')).toBe(true);
          expect(isTestEmail('jane+kosuke_test@example.com')).toBe(true);
          expect(isTestEmail('admin+kosuke_test@example.com')).toBe(true);
        });

        it('should return false for emails not matching the pattern', () => {
          expect(isTestEmail('user@example.com')).toBe(false);
          expect(isTestEmail('test@kosuke.com')).toBe(false);
          expect(isTestEmail('john+other@example.com')).toBe(false);
        });

        it('should return false for partial pattern matches', () => {
          expect(isTestEmail('kosuke_test@example.com')).toBe(false); // Missing '+'
          expect(isTestEmail('john+kosuke_test@other.com')).toBe(false); // Wrong domain
          expect(isTestEmail('john+kosuke')).toBe(false); // Incomplete suffix
        });

        it('should be case-sensitive', () => {
          expect(isTestEmail('john+KOSUKE_TEST@example.com')).toBe(false);
          expect(isTestEmail('john+kosuke_test@EXAMPLE.COM')).toBe(false);
        });

        it('should handle edge cases', () => {
          expect(isTestEmail('')).toBe(false);
          expect(isTestEmail('+kosuke_test@example.com')).toBe(true); // Valid - ends with suffix
          expect(isTestEmail('user+kosuke_test')).toBe(false); // Missing domain
        });

        it('should handle emails with multiple plus signs', () => {
          expect(isTestEmail('user+tag+kosuke_test@example.com')).toBe(true);
          expect(isTestEmail('user++kosuke_test@example.com')).toBe(true);
        });
      });

      describe('in production environment', () => {
        beforeEach(() => {
          vi.stubEnv('NODE_ENV', 'production');
        });

        it('should return false for test pattern emails in production', () => {
          expect(isTestEmail('john+kosuke_test@example.com')).toBe(false);
          expect(isTestEmail('jane+kosuke_test@example.com')).toBe(false);
        });

        it('should return false for any email in production', () => {
          expect(isTestEmail('user@example.com')).toBe(false);
          expect(isTestEmail('admin@company.com')).toBe(false);
        });
      });
    });
  });
});
