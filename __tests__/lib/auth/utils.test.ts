import { type Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SIGN_IN_ATTEMPT_EMAIL_COOKIE,
  clearSignInAttempt,
  createActivityLogData,
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
    vi.unstubAllEnvs();
    vi.resetModules();
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
        const { createSignInAttempt } = await import('@/lib/auth/utils');
        const mockSet = vi.fn();

        (cookies as Mock).mockResolvedValue({
          set: mockSet,
        });

        const email = 'test+tag@example.com';
        const result = await createSignInAttempt(email);

        expect(result).toBe(email);
        expect(mockSet).toHaveBeenCalledWith(
          SIGN_IN_ATTEMPT_EMAIL_COOKIE,
          email,
          expect.any(Object)
        );
      });

      it('should use sameSite=none when COOKIE_SAME_SITE=none', async () => {
        vi.stubEnv('COOKIE_SAME_SITE', 'none');

        const { cookies } = await import('next/headers');
        const { createSignInAttempt } = await import('@/lib/auth/utils');

        const mockSet = vi.fn();

        (cookies as Mock).mockResolvedValue({
          set: mockSet,
        });

        await createSignInAttempt('test@example.com');

        expect(mockSet).toHaveBeenCalledWith(
          SIGN_IN_ATTEMPT_EMAIL_COOKIE,
          'test@example.com',
          expect.objectContaining({
            httpOnly: true,
            secure: false,
            sameSite: 'none',
            maxAge: 600,
            path: '/',
          })
        );
      });

      it('should use COOKIE_SECURE to set secure flag', async () => {
        vi.stubEnv('COOKIE_SECURE', 'true');

        const { cookies } = await import('next/headers');
        const { createSignInAttempt } = await import('@/lib/auth/utils');
        const mockSet = vi.fn();

        (cookies as Mock).mockResolvedValue({
          set: mockSet,
        });

        await createSignInAttempt('test@example.com');

        expect(mockSet).toHaveBeenCalledWith(
          SIGN_IN_ATTEMPT_EMAIL_COOKIE,
          'test@example.com',
          expect.objectContaining({
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 600,
            path: '/',
          })
        );
      });
    });

    describe('getCurrentSignInAttempt', () => {
      it('should return email when sign-in attempt exists', async () => {
        const { cookies } = await import('next/headers');
        const mockGet = vi.fn().mockReturnValue({ value: 'test@example.com' });

        (cookies as Mock).mockResolvedValue({
          get: mockGet,
        });

        const result = await getCurrentSignInAttempt();

        expect(result).toEqual({ email: 'test@example.com' });
        expect(mockGet).toHaveBeenCalledWith(SIGN_IN_ATTEMPT_EMAIL_COOKIE);
      });

      it('should return null when sign-in attempt does not exist', async () => {
        const { cookies } = await import('next/headers');
        const mockGet = vi.fn().mockReturnValue(undefined);

        (cookies as Mock).mockResolvedValue({
          get: mockGet,
        });

        const result = await getCurrentSignInAttempt();

        expect(result).toBeNull();
      });

      it('should return null when cookie value is empty', async () => {
        const { cookies } = await import('next/headers');
        const mockGet = vi.fn().mockReturnValue(undefined);

        (cookies as Mock).mockResolvedValue({
          get: mockGet,
        });

        const result = await getCurrentSignInAttempt();

        expect(result).toBeNull();
      });
    });

    describe('clearSignInAttempt', () => {
      it('should delete the sign-in attempt cookie', async () => {
        const { cookies } = await import('next/headers');
        const mockDelete = vi.fn();

        (cookies as Mock).mockResolvedValue({
          delete: mockDelete,
        });

        await clearSignInAttempt();

        expect(mockDelete).toHaveBeenCalledWith(SIGN_IN_ATTEMPT_EMAIL_COOKIE);
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
