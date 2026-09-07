import { expect, test } from '@playwright/test';

import { STORAGE_STATE } from './support/constants';
import { stubTrpcProcedures } from './support/trpc-stub';

test.use({ storageState: STORAGE_STATE.jane });

/**
 * Pricing normally comes from a live Stripe account. The suite must never
 * depend on Stripe credentials or network, so only those two procedures are
 * substituted; subscription status, eligibility, org role and the page itself
 * are the real thing.
 */
const PRICING = {
  free_monthly: {
    price: 0,
    name: 'Free',
    description: 'Perfect for getting started',
    features: [{ name: 'Basic features' }, { name: 'Community support' }],
    priceId: 'price_e2e_free',
    productId: 'prod_e2e_free',
    lookupKey: 'free_monthly',
  },
  pro_monthly: {
    price: 20,
    name: 'Pro',
    description: 'For growing teams',
    features: [{ name: 'All free features' }, { name: 'Priority support' }],
    priceId: 'price_e2e_pro',
    productId: 'prod_e2e_pro',
    lookupKey: 'pro_monthly',
  },
};

test('the billing page renders the plan UI with an actionable checkout button', async ({
  page,
}) => {
  await stubTrpcProcedures(page, {
    'billing.isConfigured': { isConfigured: true },
    'billing.getPricing': PRICING,
  });

  await page.goto('/settings/billing');

  await expect(page).toHaveURL(/\/settings\/billing$/);

  // Current plan comes from the real subscription record: the seeded org is free.
  await expect(page.getByRole('heading', { name: 'Billing & Subscription' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Free', level: 3 })).toBeVisible();
  await expect(page.getByText('Perfect for getting started')).toBeVisible();

  // Upgrade options render.
  await expect(page.getByText('Choose Your Plan')).toBeVisible();
  await expect(page.getByText('For growing teams')).toBeVisible();
  await expect(page.getByText('$20')).toBeVisible();

  // The checkout entry point exists and is actionable for an org owner.
  // It is never clicked — that would open Stripe.
  const checkout = page.getByRole('button', { name: 'Subscribe to Pro' });
  await expect(checkout).toBeVisible();
  await expect(checkout).toBeEnabled();
});
