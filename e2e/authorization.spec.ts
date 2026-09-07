import { expect, test } from '@playwright/test';

import { SEEDED_USERS } from './support/constants';

// No stored session: this is the anonymous visitor.
test.use({ storageState: { cookies: [], origins: [] } });

/**
 * The highest-value assertion in the suite: the proxy must refuse to serve an
 * organization route to an anonymous visitor.
 */
test('an anonymous request to an org dashboard is redirected to sign-in', async ({ page }) => {
  const target = `/org/${SEEDED_USERS.jane.orgSlug}/dashboard`;

  await page.goto(target);

  await expect(page).toHaveURL(/\/sign-in/);
  // The originally requested path is preserved so the user resumes after auth.
  expect(new URL(page.url()).searchParams.get('redirect')).toBe(target);
  await expect(page.getByText('Sign in to Kosuke Template')).toBeVisible();

  // And nothing from the protected page leaked into the response.
  await expect(page.getByRole('heading', { name: 'Component Showcase' })).toHaveCount(0);
});

test('an anonymous request to account settings is redirected to sign-in', async ({ page }) => {
  await page.goto('/settings/billing');

  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByRole('heading', { name: 'Billing & Subscription' })).toHaveCount(0);
});
