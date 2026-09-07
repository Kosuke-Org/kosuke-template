import type { Locator, Page } from '@playwright/test';

/**
 * The sidebar workspace switcher.
 *
 * The sidebar is not exposed as a `navigation` landmark, so the switcher is
 * matched on its accessible name, which always ends with the workspace count
 * (for example "J Jane Smith Co. 1 workspace").
 */
export function orgSwitcher(page: Page): Locator {
  return page.getByRole('button', { name: /\d+ workspaces?$/ });
}
