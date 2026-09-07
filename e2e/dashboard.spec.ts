import { expect, test } from '@playwright/test';

import { SEEDED_USERS, STORAGE_STATE } from './support/constants';
import { orgSwitcher } from './support/locators';

test.use({ storageState: STORAGE_STATE.jane });

/**
 * Proves the App Router renders the org dashboard for real: the server layout
 * resolves the slug, the client tree hydrates, and nothing bounces back to
 * sign-in or falls through to an error boundary.
 */
test('the org dashboard renders real content for a member', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(`/org/${SEEDED_USERS.jane.orgSlug}/dashboard`);

  // A server-side crash would surface here as a 500 rather than a rendered page.
  expect(response?.status()).toBe(200);

  // Not redirected away.
  await expect(page).toHaveURL(new RegExp(`/org/${SEEDED_USERS.jane.orgSlug}/dashboard$`));

  // Real page content.
  await expect(page.getByRole('heading', { name: 'Component Showcase' })).toBeVisible();
  await expect(page.getByText('Total Users')).toBeVisible();

  // The org-scoped shell hydrated with the right organization.
  await expect(orgSwitcher(page)).toContainText(SEEDED_USERS.jane.orgName);

  // Hydration and client rendering completed without throwing.
  expect(errors).toEqual([]);
});

test('an unknown org slug renders the not-found state instead of crashing', async ({ page }) => {
  await page.goto('/org/this-org-does-not-exist/dashboard');

  await expect(page.getByRole('heading', { name: 'Organization not found' })).toBeVisible();
});
