/**
 * Deterministic accounts created by `bun run db:seed`.
 *
 * The `+kosuke_test@example.com` suffix makes Better Auth accept a fixed OTP
 * (see lib/auth/utils.ts `isTestEmail`), which is what lets the suite sign in
 * without an inbox. That shortcut only exists when NODE_ENV === 'development',
 * which is why the e2e server runs `next dev`.
 */
export const SEEDED_USERS = {
  /** Sole owner of "Jane Smith Co." — her active organization is unambiguous. */
  jane: {
    email: 'jane+kosuke_test@example.com',
    orgName: 'Jane Smith Co.',
    orgSlug: 'jane-smith-co',
  },
  /** Used for the org-creation flow so it never mutates Jane's active org. */
  john: {
    email: 'john+kosuke_test@example.com',
  },
} as const;

/** Fixed OTP accepted for test emails (lib/auth/constants.ts `TEST_OTP`). */
export const TEST_OTP = '424242';

/** Signed-in browser state produced by e2e/auth.setup.ts, relative to the repo root. */
export const STORAGE_STATE = {
  jane: 'e2e/.auth/jane.json',
  john: 'e2e/.auth/john.json',
} as const;
