import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTRPCContext } from '@/__tests__/setup/mocks';
import { expectTRPCError } from '@/__tests__/setup/utils';

import { TEST_OTP } from '@/lib/auth/constants';
import { auth } from '@/lib/auth/providers';
import {
  clearSignInAttempt,
  createSignInAttempt,
  getCurrentSignInAttempt,
  isTestEmail,
} from '@/lib/auth/utils';
import { db } from '@/lib/db/drizzle';
import { createUser, getUserByEmail } from '@/lib/services';
import { createCaller } from '@/lib/trpc/server';

vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      sendVerificationOTP: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth/utils', () => ({
  clearSignInAttempt: vi.fn(),
  createSignInAttempt: vi.fn(),
  getCurrentSignInAttempt: vi.fn(),
  isTestEmail: vi.fn(() => false),
}));

vi.mock('@/lib/services', () => ({
  createUser: vi.fn(),
  getUserByEmail: vi.fn(),
}));

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    update: vi.fn(),
  },
}));

describe('Auth Router', () => {
  const email = 'someone@example.com';
  const existingUser = {
    id: 'user_123',
    email,
    emailVerified: true,
    displayName: 'Someone',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  // db.update(verifications).set({ value }).where(...)
  const setSpy = vi.fn();
  const whereSpy = vi.fn();

  // The whole router is public: every caller below is deliberately unauthenticated.
  const caller = () => createCaller(createMockTRPCContext({ userId: null }));

  beforeEach(() => {
    vi.clearAllMocks();

    whereSpy.mockResolvedValue(undefined);
    setSpy.mockReturnValue({ where: whereSpy });
    vi.mocked(db.update).mockReturnValue({ set: setSpy } as never);

    vi.mocked(isTestEmail).mockReturnValue(false);
    vi.mocked(auth.api.sendVerificationOTP).mockResolvedValue({ success: true } as never);
    vi.mocked(createSignInAttempt).mockResolvedValue(email);
  });

  describe('requestOtp - sign-in', () => {
    it('sends an OTP and records the attempt for an existing user', async () => {
      vi.mocked(getUserByEmail).mockResolvedValue(existingUser as never);

      const result = await (await caller()).auth.requestOtp({ email, type: 'sign-in' });

      expect(result).toEqual({ success: true });
      expect(auth.api.sendVerificationOTP).toHaveBeenCalledWith({
        body: { email, type: 'sign-in' },
      });
      expect(createSignInAttempt).toHaveBeenCalledWith(email);
    });

    it('rejects sign-in for an unknown email with NOT_FOUND', async () => {
      // getUserByEmail is typed as non-nullable even though it returns null at runtime.
      vi.mocked(getUserByEmail).mockResolvedValue(null as never);

      await expectTRPCError(
        (await caller()).auth.requestOtp({ email, type: 'sign-in' }),
        'NOT_FOUND',
        'User not found'
      );

      // The distinct NOT_FOUND response is what makes this endpoint enumerable.
      expect(auth.api.sendVerificationOTP).not.toHaveBeenCalled();
      expect(createSignInAttempt).not.toHaveBeenCalled();
    });

    it('pins the verification code to the fixed test OTP for test emails', async () => {
      vi.mocked(getUserByEmail).mockResolvedValue(existingUser as never);
      vi.mocked(isTestEmail).mockReturnValue(true);

      await (await caller()).auth.requestOtp({ email, type: 'sign-in' });

      expect(db.update).toHaveBeenCalled();
      expect(setSpy).toHaveBeenCalledWith({ value: TEST_OTP });
      expect(whereSpy).toHaveBeenCalled();
    });

    it('does not touch the verifications table for a normal email', async () => {
      vi.mocked(getUserByEmail).mockResolvedValue(existingUser as never);

      await (await caller()).auth.requestOtp({ email, type: 'sign-in' });

      expect(db.update).not.toHaveBeenCalled();
    });

    it('is reachable without a session', async () => {
      vi.mocked(getUserByEmail).mockResolvedValue(existingUser as never);

      await expect((await caller()).auth.requestOtp({ email, type: 'sign-in' })).resolves.toEqual({
        success: true,
      });
    });
  });

  describe('requestOtp - sign-up', () => {
    it('creates an unverified user and sends the verification OTP', async () => {
      // getUserByEmail is typed as non-nullable even though it returns null at runtime.
      vi.mocked(getUserByEmail).mockResolvedValue(null as never);
      vi.mocked(createUser).mockResolvedValue(existingUser as never);

      const result = await (
        await caller()
      ).auth.requestOtp({
        email,
        type: 'email-verification',
        terms: true,
        marketing: true,
      });

      expect(result).toEqual({ success: true });
      expect(createUser).toHaveBeenCalledWith({
        email,
        emailVerified: false,
        displayName: '',
        notificationSettings: {
          emailNotifications: false,
          marketingEmails: true,
          securityAlerts: false,
        },
      });
      expect(auth.api.sendVerificationOTP).toHaveBeenCalledWith({
        body: { email, type: 'email-verification' },
      });
      expect(createSignInAttempt).toHaveBeenCalledWith(email);
    });

    it('defaults marketing consent to false when it is omitted', async () => {
      // getUserByEmail is typed as non-nullable even though it returns null at runtime.
      vi.mocked(getUserByEmail).mockResolvedValue(null as never);
      vi.mocked(createUser).mockResolvedValue(existingUser as never);

      await (await caller()).auth.requestOtp({ email, type: 'email-verification', terms: true });

      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          notificationSettings: expect.objectContaining({ marketingEmails: false }),
        })
      );
    });

    it('rejects sign-up when the email is already registered', async () => {
      vi.mocked(getUserByEmail).mockResolvedValue(existingUser as never);

      await expectTRPCError(
        (await caller()).auth.requestOtp({ email, type: 'email-verification', terms: true }),
        'BAD_REQUEST',
        'User already exists'
      );

      expect(createUser).not.toHaveBeenCalled();
      expect(auth.api.sendVerificationOTP).not.toHaveBeenCalled();
    });

    it('rejects sign-up when terms are not accepted', async () => {
      await expectTRPCError(
        (await caller()).auth.requestOtp({
          email,
          type: 'email-verification',
          terms: false,
        }),
        'BAD_REQUEST',
        'You must agree to the terms of service'
      );

      expect(getUserByEmail).not.toHaveBeenCalled();
    });
  });

  describe('requestOtp - input validation', () => {
    it('rejects a malformed email address', async () => {
      await expectTRPCError(
        (await caller()).auth.requestOtp({ email: 'not-an-email', type: 'sign-in' }),
        'BAD_REQUEST',
        'Invalid email address'
      );
      expect(getUserByEmail).not.toHaveBeenCalled();
    });

    it('rejects an unknown OTP type', async () => {
      await expectTRPCError(
        // @ts-expect-error - deliberately invalid discriminator
        (await caller()).auth.requestOtp({ email, type: 'password-reset' }),
        'BAD_REQUEST'
      );
      expect(getUserByEmail).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentSignInAttempt', () => {
    it('returns the pending email when an attempt cookie exists', async () => {
      vi.mocked(getCurrentSignInAttempt).mockResolvedValue({ email });

      const result = await (await caller()).auth.getCurrentSignInAttempt();

      expect(result).toEqual({ success: true, email });
    });

    it('reports failure without an email when no attempt exists', async () => {
      vi.mocked(getCurrentSignInAttempt).mockResolvedValue(null);

      const result = await (await caller()).auth.getCurrentSignInAttempt();

      expect(result).toEqual({ success: false });
    });

    it('wraps a cookie read failure as INTERNAL_SERVER_ERROR', async () => {
      vi.mocked(getCurrentSignInAttempt).mockRejectedValue(new Error('cookies unavailable'));

      await expectTRPCError(
        (await caller()).auth.getCurrentSignInAttempt(),
        'INTERNAL_SERVER_ERROR',
        'Failed to fetch sign-in attempt'
      );
    });
  });

  describe('clearSignInAttempt', () => {
    it('clears the attempt cookie', async () => {
      vi.mocked(clearSignInAttempt).mockResolvedValue(undefined);

      const result = await (await caller()).auth.clearSignInAttempt();

      expect(result).toEqual({ success: true });
      expect(clearSignInAttempt).toHaveBeenCalled();
    });

    it('wraps a cookie write failure as INTERNAL_SERVER_ERROR', async () => {
      vi.mocked(clearSignInAttempt).mockRejectedValue(new Error('cookies unavailable'));

      await expectTRPCError(
        (await caller()).auth.clearSignInAttempt(),
        'INTERNAL_SERVER_ERROR',
        'Failed to clear sign-in attempt'
      );
    });
  });
});
