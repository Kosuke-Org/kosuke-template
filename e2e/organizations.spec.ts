import { expect, test } from '@playwright/test';

import { STORAGE_STATE } from './support/constants';
import { orgSwitcher } from './support/locators';

// John is used here so creating (and switching to) a new organization never
// disturbs the org the other specs rely on.
test.use({ storageState: STORAGE_STATE.john });

test('creating an organization switches to it and lists it in the org switcher', async ({
  page,
}) => {
  // Unique per run: the suite runs against a database it does not reset.
  const orgName = `E2E Workspace ${Date.now()}`;

  await page.goto('/');
  await expect(page).toHaveURL(/\/org\/[^/]+\/dashboard/);

  await orgSwitcher(page).click();
  await page.getByRole('menuitem', { name: 'Create Workspace' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Workspace Name').fill(orgName);
  await dialog.getByRole('button', { name: 'Create Workspace' }).click();

  // The app redirects into the freshly created organization.
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/org\/e2e-workspace-[^/]+\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Component Showcase' })).toBeVisible();

  // The new workspace is the active one in the switcher...
  await expect(orgSwitcher(page)).toContainText(orgName);

  // ...and it is listed among the user's workspaces.
  await orgSwitcher(page).click();
  await expect(page.getByRole('menu').getByText(orgName)).toBeVisible();
});
