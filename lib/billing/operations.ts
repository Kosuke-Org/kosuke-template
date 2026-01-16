import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

import { BILLING_URLS, type PricingData } from '@/lib/billing';
import { db } from '@/lib/db';
import { SubscriptionStatus, SubscriptionTier } from '@/lib/db/schema';
import { orgSubscriptions, organizations } from '@/lib/db/schema';
import { type CheckoutSessionParams, type OperationResult } from '@/lib/types';

import { stripe } from './client';
import { getSubscriptionEligibility } from './eligibility';
import { SubscriptionTierType, getAllLookupKeys } from './products';
import { getOrgSubscription } from './subscription';

/**
 * Billing operations: checkout, cancel, reactivate
 * Handles Stripe API interactions for subscription management
 */

/**
 * Get pricing information from Stripe
 * Fetches all active prices using lookup keys and transforms to app format
 */
export async function getPricingFromStripe(): Promise<PricingData> {
  try {
    // Fetch all lookup keys from products.json
    const lookupKeys = getAllLookupKeys();

    // Fetch prices from Stripe using lookup keys
    const pricesWithProducts = await stripe.prices.list({
      active: true,
      lookup_keys: lookupKeys,
      expand: ['data.product'],
    });

    // Transform Stripe data to match our app's PRICING format
    const pricing: PricingData = {};

    // Sort prices by unit_amount (lowest to highest) for logical UI rendering
    const sortedPrices = [...pricesWithProducts.data].sort((a, b) => {
      const amountA = a.unit_amount || 0;
      const amountB = b.unit_amount || 0;
      return amountA - amountB;
    });

    for (const price of sortedPrices) {
      if (!price.lookup_key) {
        continue;
      }

      const product = price.product as Stripe.Product;

      pricing[price.lookup_key] = {
        price: (price.unit_amount || 0) / 100, // Convert cents to dollars
        name: product.name,
        description: product.description ?? '',
        features:
          product.marketing_features
            .filter((feature) => Boolean(feature.name))
            .map((feature) => ({
              name: feature.name!,
            })) || [],
        priceId: price.id,
        productId: product.id,
        lookupKey: price.lookup_key,
      };
    }

    return pricing;
  } catch (error) {
    console.error('Error fetching pricing from Stripe:', error);
    throw error;
  }
}

/**
 * Get or create Stripe customer for an organization
 */
async function getOrCreateStripeCustomer(
  organizationId: string,
  customerEmail: string
): Promise<string> {
  // Check if organization already has a Stripe customer ID
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (org?.stripeCustomerId) {
    return org.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: customerEmail,
    name: org?.name,
    metadata: {
      organizationId,
    },
  });

  // Save customer ID to organization record
  await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId));

  return customer.id;
}

/**
 * Create free-tier subscription for a new organization
 * Creates Stripe customer and subscription - webhook will handle database record creation
 */
export async function createFreeTierSubscription(params: {
  organizationId: string;
  customerEmail: string;
}): Promise<OperationResult> {
  try {
    const { organizationId, customerEmail } = params;

    console.log('🆓 Creating free-tier subscription for organization:', organizationId);

    // Check if organization already has a subscription
    const existingSubscription = await db.query.orgSubscriptions.findFirst({
      where: eq(orgSubscriptions.organizationId, organizationId),
    });

    if (existingSubscription) {
      console.log('ℹ️ Organization already has a subscription:', organizationId);
      return {
        success: true,
        message: 'Organization already has a subscription',
      };
    }

    // Get the free tier price ID
    const freePriceId = await getPriceByLookupKey(SubscriptionTier.FREE_MONTHLY);
    if (!freePriceId) {
      console.error('❌ No free tier price found in Stripe - check Stripe configuration');
      return {
        success: false,
        message: 'Stripe configuration error: free tier price not found',
      };
    }

    // Create Stripe customer for the organization
    const customerId = await getOrCreateStripeCustomer(organizationId, customerEmail);

    // Create Stripe subscription with metadata
    // The webhook will handle creating the database record
    const stripeSubscription = await stripe.subscriptions.create(
      {
        customer: customerId,
        items: [{ price: freePriceId }],
        metadata: {
          organizationId,
          tier: SubscriptionTier.FREE_MONTHLY,
        },
      },
      {
        idempotencyKey: `free-tier-${organizationId}`,
      }
    );

    console.log('✅ Created Stripe subscription:', stripeSubscription.id);
    console.log('⏳ Webhook will handle database record creation');

    return {
      success: true,
      message: 'Free-tier subscription created successfully',
    };
  } catch (error) {
    console.error('💥 Error creating free-tier subscription:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create free-tier subscription',
    };
  }
}

/**
 * Delete Stripe customer for an organization
 * Called when an organization is being deleted
 */
export async function deleteStripeCustomer(organizationId: string): Promise<OperationResult> {
  try {
    console.log('🗑️ Deleting Stripe customer for organization:', organizationId);

    // Get organization's Stripe customer ID
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org?.stripeCustomerId) {
      console.log('ℹ️ No Stripe customer found for organization:', organizationId);
      return {
        success: true,
        message: 'No Stripe customer to delete',
      };
    }

    // Delete customer in Stripe (this will automatically cancel all subscriptions)
    await stripe.customers.del(org.stripeCustomerId);

    console.log('✅ Successfully deleted Stripe customer:', org.stripeCustomerId);

    return {
      success: true,
      message: 'Stripe customer deleted successfully',
    };
  } catch (error) {
    console.error('💥 Error deleting Stripe customer:', error);
    // Don't fail the organization deletion if Stripe deletion fails
    // Log the error but return success
    return {
      success: true,
      message: 'Organization deleted (Stripe cleanup may need manual intervention)',
    };
  }
}

/**
 * Get Stripe price ID by lookup key
 * @param lookupKey - The Stripe lookup key (e.g., 'free_monthly', 'pro_monthly')
 */
async function getPriceByLookupKey(lookupKey: SubscriptionTierType) {
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      limit: 1,
      active: true,
    });

    if (prices.data.length === 0) {
      console.error(`No active price found for lookup key: ${lookupKey}`);
      return null;
    }

    return prices.data[0].id;
  } catch (error) {
    console.error(`Error fetching price for lookup key ${lookupKey}:`, error);
    return null;
  }
}

/**
 * Create a subscription schedule for downgrade (deferred subscription change)
 */
async function createSubscriptionSchedule(
  params: CheckoutSessionParams
): Promise<OperationResult<{ url: string; id: string }>> {
  try {
    const { tier, organizationId, customerEmail } = params;

    // Get current subscription
    const currentSubscription = await getOrgSubscription(organizationId);

    if (
      !currentSubscription.activeSubscription?.stripeSubscriptionId ||
      !currentSubscription.currentPeriodEnd
    ) {
      return {
        success: false,
        message: 'No active subscription found to downgrade from.',
      };
    }

    // Get price ID using lookup key
    const priceId = await getPriceByLookupKey(tier);
    if (!priceId) {
      return {
        success: false,
        message: `Invalid tier or price not found: ${tier}`,
      };
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(organizationId, customerEmail);

    // Create subscription schedule to start after current period ends
    const schedule = await stripe.subscriptionSchedules.create({
      customer: customerId,
      start_date: Math.floor(currentSubscription.currentPeriodEnd.getTime() / 1000),
      end_behavior: 'release', // Convert to regular subscription after schedule completes
      phases: [
        {
          items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          metadata: {
            organizationId: organizationId,
            tier,
            isDowngrade: 'true',
          },
        },
      ],
      metadata: {
        organizationId: organizationId,
        targetTier: tier,
        isDowngrade: 'true',
        currentSubscriptionId: currentSubscription.activeSubscription.stripeSubscriptionId,
      },
    });

    // Mark current subscription to cancel at period end
    await stripe.subscriptions.update(currentSubscription.activeSubscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Update local database to mark scheduled downgrade
    await db
      .update(orgSubscriptions)
      .set({
        cancelAtPeriodEnd: 'true',
        scheduledDowngradeTier: tier, // Track the target tier
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        eq(
          orgSubscriptions.stripeSubscriptionId,
          currentSubscription.activeSubscription.stripeSubscriptionId
        )
      );

    console.log('✅ Created subscription schedule for downgrade:', schedule.id);

    // Capitalize tier name for message
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);

    return {
      success: true,
      message: `Your subscription will downgrade to ${tierName} on ${currentSubscription.currentPeriodEnd.toLocaleDateString()}`,
      data: {
        url: BILLING_URLS.success, // Redirect to success page
        id: schedule.id,
      },
    };
  } catch (error) {
    console.error('💥 Error creating subscription schedule:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create subscription schedule',
    };
  }
}

/**
 * Get price amount for a lookup key (fetches from Stripe)
 * @param lookupKey - The Stripe lookup key (e.g., 'free_monthly', 'pro_monthly')
 */
async function getTierPrice(lookupKey: string): Promise<number> {
  try {
    const prices = await stripe.prices.list({
      lookup_keys: [lookupKey],
      limit: 1,
      active: true,
    });

    if (prices.data.length === 0) {
      return 0;
    }

    return (prices.data[0].unit_amount || 0) / 100; // Convert cents to dollars
  } catch (error) {
    console.error(`Error fetching price for lookup key ${lookupKey}:`, error);
    return 0;
  }
}

/**
 * Create a Stripe Checkout session for upgrades or new subscriptions
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<OperationResult<{ url: string; id: string }>> {
  try {
    const { tier, organizationId, customerEmail, metadata = {}, redirectUrl, cancelUrl } = params;

    // Check if this is a downgrade
    const currentSubscription = await getOrgSubscription(organizationId);
    const currentPrice = await getTierPrice(currentSubscription.tier);
    const newPrice = await getTierPrice(tier);

    // If downgrading (new price < current price), use subscription schedule
    if (currentSubscription.tier !== SubscriptionTier.FREE_MONTHLY && newPrice < currentPrice) {
      console.log('🔽 Detected downgrade, creating subscription schedule instead');
      return createSubscriptionSchedule(params);
    }

    // Get price ID using lookup key
    const priceId = await getPriceByLookupKey(tier);
    if (!priceId) {
      return {
        success: false,
        message: `Invalid tier or price not found: ${tier}`,
      };
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(organizationId, customerEmail);

    // Create checkout session for upgrade or new subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: redirectUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId: organizationId,
        tier,
        ...metadata,
      },
      subscription_data: {
        metadata: {
          organizationId: organizationId,
          tier,
        },
      },
    });

    return {
      success: true,
      message: 'Checkout session created successfully',
      data: {
        url: session.url!,
        id: session.id,
      },
    };
  } catch (error) {
    console.error('💥 Error creating checkout session:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

/**
 * Cancel organization's active subscription (mark for cancellation at period end)
 */
export async function cancelOrgSubscription(
  organizationId: string,
  stripeSubscriptionId: string
): Promise<OperationResult> {
  try {
    console.log('🔄 Canceling subscription via Stripe API:', stripeSubscriptionId);

    const currentSubscription = await getOrgSubscription(organizationId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    if (!eligibility.canCancel) {
      return {
        success: false,
        message: 'Subscription cannot be canceled at this time.',
      };
    }

    if (
      !currentSubscription.activeSubscription ||
      currentSubscription.activeSubscription.stripeSubscriptionId !== stripeSubscriptionId
    ) {
      return {
        success: false,
        message: 'Subscription not found or does not belong to this organization.',
      };
    }

    // Cancel subscription at period end via Stripe API
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    console.log('✅ Successfully canceled subscription in Stripe');

    // Update local database
    await db
      .update(orgSubscriptions)
      .set({
        cancelAtPeriodEnd: 'true',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orgSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    console.log('✅ Successfully updated local subscription status');

    return {
      success: true,
      message:
        'Subscription has been successfully canceled. You will continue to have access until the end of your current billing period.',
    };
  } catch (error) {
    console.error('💥 Error in cancelOrgSubscription:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to cancel subscription at this time. Please contact support.',
    };
  }
}

/**
 * Reactivate a canceled subscription (remove cancellation)
 */
export async function reactivateOrgSubscription(
  organizationId: string,
  stripeSubscriptionId: string
): Promise<OperationResult> {
  try {
    console.log('🔄 Reactivating subscription via Stripe API:', stripeSubscriptionId);

    const currentSubscription = await getOrgSubscription(organizationId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    if (!eligibility.canReactivate) {
      return {
        success: false,
        message: 'Subscription cannot be reactivated at this time.',
      };
    }

    if (
      !currentSubscription.activeSubscription ||
      currentSubscription.activeSubscription.stripeSubscriptionId !== stripeSubscriptionId
    ) {
      return {
        success: false,
        message: 'Subscription not found or does not belong to this organization.',
      };
    }

    // Reactivate subscription via Stripe API
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    console.log('✅ Successfully reactivated subscription in Stripe');

    // Update local database
    await db
      .update(orgSubscriptions)
      .set({
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: 'false',
        canceledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(orgSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    console.log('✅ Successfully updated local subscription status to active');

    return {
      success: true,
      message: 'Subscription has been successfully reactivated.',
    };
  } catch (error) {
    console.error('💥 Error in reactivateOrgSubscription:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to reactivate subscription at this time. Please contact support.',
    };
  }
}

/**
 * Create Stripe Customer Portal session for subscription management
 */
export async function createCustomerPortalSession(
  organizationId: string
): Promise<OperationResult<{ url: string }>> {
  try {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!org?.stripeCustomerId) {
      return {
        success: false,
        message: 'No Stripe customer found for this organization.',
      };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: BILLING_URLS.cancel,
    });

    return {
      success: true,
      message: 'Customer portal session created',
      data: {
        url: session.url,
      },
    };
  } catch (error) {
    console.error('💥 Error creating customer portal session:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create portal session',
    };
  }
}

/**
 * Cancel a pending subscription downgrade (cancels the subscription schedule)
 */
export async function cancelPendingDowngrade(organizationId: string): Promise<OperationResult> {
  try {
    console.log('🔄 Canceling pending downgrade for organization:', organizationId);

    // Get current subscription
    const currentSubscription = await getOrgSubscription(organizationId);

    if (!currentSubscription.activeSubscription?.scheduledDowngradeTier) {
      return {
        success: false,
        message: 'No pending downgrade found.',
      };
    }

    if (!currentSubscription.activeSubscription?.stripeCustomerId) {
      return {
        success: false,
        message: 'No Stripe customer found.',
      };
    }

    // Find the subscription schedule for this customer
    const schedules = await stripe.subscriptionSchedules.list({
      customer: currentSubscription.activeSubscription.stripeCustomerId,
      limit: 10,
    });

    console.log('📋 Found schedules:', schedules.data.length);
    schedules.data.forEach((schedule) => {
      console.log(
        `  Schedule ${schedule.id}: status=${schedule.status}, metadata=`,
        schedule.metadata
      );
    });

    // Find the pending schedule for this organization (status can be 'not_started' or 'active')
    const pendingSchedule = schedules.data.find(
      (schedule) =>
        schedule.metadata?.organizationId === organizationId &&
        (schedule.status === 'active' || schedule.status === 'not_started')
    );

    if (!pendingSchedule) {
      console.error('❌ No pending schedule found for organization:', organizationId);
      console.error(
        'Available schedules:',
        schedules.data.map((s) => ({
          id: s.id,
          status: s.status,
          metadata: s.metadata,
        }))
      );
      return {
        success: false,
        message: 'No pending subscription schedule found.',
      };
    }

    console.log(
      '✅ Found pending schedule:',
      pendingSchedule.id,
      'with status:',
      pendingSchedule.status
    );

    // Cancel the subscription schedule in Stripe
    await stripe.subscriptionSchedules.cancel(pendingSchedule.id);

    console.log('✅ Canceled subscription schedule in Stripe:', pendingSchedule.id);

    // Reactivate the current subscription in Stripe
    if (currentSubscription.activeSubscription.stripeSubscriptionId) {
      await stripe.subscriptions.update(
        currentSubscription.activeSubscription.stripeSubscriptionId,
        {
          cancel_at_period_end: false,
        }
      );
      console.log('✅ Reactivated current subscription in Stripe');
    }

    // Update local database
    await db
      .update(orgSubscriptions)
      .set({
        scheduledDowngradeTier: null,
        cancelAtPeriodEnd: 'false',
        canceledAt: null,
        status: SubscriptionStatus.ACTIVE,
        updatedAt: new Date(),
      })
      .where(eq(orgSubscriptions.organizationId, organizationId));

    console.log('✅ Successfully canceled pending downgrade');

    return {
      success: true,
      message: 'Pending downgrade has been canceled. Your current subscription will continue.',
    };
  } catch (error) {
    console.error('💥 Error canceling pending downgrade:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to cancel pending downgrade. Please contact support.',
    };
  }
}
