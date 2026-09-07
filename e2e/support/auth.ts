import { type Page, expect } from '@playwright/test';

import { TEST_OTP } from './constants';

/**
 * Drives the real email-OTP sign-in UI end to end.
 *
 * Deliberately goes through the browser rather than seeding a session cookie:
 * the redirect chain (sign-in -> verify -> proxy -> dashboard) is one of the
 * things this suite exists to protect.
 */
export async function signIn(page: Page, email: string): Promise<void> {
  await page.goto('/sign-in');

  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Continue' }).click();

  // A missing seed is by far the most likely reason to land here, so say so.
  await expect(
    page,
    `Expected to reach the OTP step for ${email}. Run \`bun run db:seed\` first.`
  ).toHaveURL(/\/sign-in\/verify/);

  await page.locator('input[data-input-otp]').pressSequentially(TEST_OTP);

  // The OTP form auto-submits on completion and hard-navigates on success.
  await expect(page).not.toHaveURL(/\/sign-in/, { timeout: 30_000 });
}
