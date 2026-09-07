import { expect, test } from '@playwright/test';

import { signIn } from './support/auth';
import { SEEDED_USERS } from './support/constants';

// Signs in from a clean browser, so no stored session.
test.use({ storageState: { cookies: [], origins: [] } });

test('a seeded user can sign in and lands on their organization dashboard', async ({ page }) => {
  await signIn(page, SEEDED_USERS.jane.email);

  await expect(page).toHaveURL(new RegExp(`/org/${SEEDED_USERS.jane.orgSlug}/dashboard$`));
  await expect(page.getByRole('heading', { name: 'Component Showcase' })).toBeVisible();
});
