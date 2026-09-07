import { expect, test } from '@playwright/test';

import { SEEDED_USERS, STORAGE_STATE } from './support/constants';

test.use({ storageState: STORAGE_STATE.jane });

/**
 * Exercises the base64 upload path end to end: browser file picker -> tRPC
 * mutation -> storage write -> database row -> table refetch.
 *
 * Indexing is queued asynchronously (and needs a worker plus a Google AI key),
 * so the assertion stops at "the document is listed" and never depends on the
 * document reaching `ready`.
 */
test('an uploaded document appears in the documents table', async ({ page }) => {
  const displayName = `e2e-upload-${Date.now()}.txt`;

  await page.goto(`/org/${SEEDED_USERS.jane.orgSlug}/documents`);

  await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();

  await page.getByRole('button', { name: 'Upload Document' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Upload Document' })).toBeVisible();

  await dialog.locator('#file-input').setInputFiles({
    name: displayName,
    mimeType: 'text/plain',
    buffer: Buffer.from('Kosuke end-to-end upload fixture.\n'),
  });

  // The dialog auto-fills the title from the file name.
  await expect(dialog.getByLabel('Document Title')).toHaveValue(displayName);

  await dialog.getByRole('button', { name: 'Upload' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('cell', { name: displayName })).toBeVisible();
});
