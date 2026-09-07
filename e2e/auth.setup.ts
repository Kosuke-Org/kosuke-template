import { expect, test as setup } from '@playwright/test';

import { signIn } from './support/auth';
import { SEEDED_USERS, STORAGE_STATE } from './support/constants';

/**
 * Signs the seeded users in once and stores their browser state, so the specs
 * that only care about a page (dashboard, billing, documents) do not each pay
 * for the OTP round trip.
 */

setup('authenticate as jane', async ({ page }) => {
  await signIn(page, SEEDED_USERS.jane.email);

  // Jane owns exactly one organization, so the proxy must land her on it.
  await expect(page).toHaveURL(new RegExp(`/org/${SEEDED_USERS.jane.orgSlug}/dashboard`));

  await page.context().storageState({ path: STORAGE_STATE.jane });
});

setup('authenticate as john', async ({ page }) => {
  await signIn(page, SEEDED_USERS.john.email);

  // John belongs to two organizations; which one is active is not guaranteed,
  // so only assert that he reached an organization dashboard.
  await expect(page).toHaveURL(/\/org\/[^/]+\/dashboard/);

  await page.context().storageState({ path: STORAGE_STATE.john });
});
