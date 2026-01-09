import { eq } from 'drizzle-orm';

import { BILLING_URLS, PRICE_IDS, PRICING } from '@/lib/billing';
import { db } from '@/lib/db';
import { SubscriptionStatus, SubscriptionTier } from '@/lib/db/schema';
import { userSubscriptions, users } from '@/lib/db/schema';
import { type CheckoutSessionParams, type OperationResult } from '@/lib/types';

import { stripe } from './client';
import { getSubscriptionEligibility } from './eligibility';
import { getUserSubscription } from './subscription';

/**
 * Billing operations: checkout, cancel, reactivate
 * Handles Stripe API interactions for subscription management
 */

/**
 * Get or create Stripe customer for a user
 */
async function getOrCreateStripeCustomer(userId: string, customerEmail: string): Promise<string> {
  // Check if user already has a Stripe customer ID
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: customerEmail,
    metadata: {
      userId,
    },
  });

  // Save customer ID to user record
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return customer.id;
}

/**
 * Create a subscription schedule for downgrade (deferred subscription change)
 */
async function createSubscriptionSchedule(
  params: CheckoutSessionParams
): Promise<OperationResult<{ url: string; id: string }>> {
  try {
    const { tier, userId, customerEmail } = params;

    // Get current subscription
    const currentSubscription = await getUserSubscription(userId);

    if (
      !currentSubscription.activeSubscription?.stripeSubscriptionId ||
      !currentSubscription.currentPeriodEnd
    ) {
      return {
        success: false,
        message: 'No active subscription found to downgrade from.',
      };
    }

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return {
        success: false,
        message: `Invalid tier: ${tier}`,
      };
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, customerEmail);

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
            userId: userId,
            tier,
            isDowngrade: 'true',
          },
        },
      ],
      metadata: {
        userId: userId,
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
      .update(userSubscriptions)
      .set({
        cancelAtPeriodEnd: 'true',
        scheduledDowngradeTier: tier, // Track the target tier
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        eq(
          userSubscriptions.stripeSubscriptionId,
          currentSubscription.activeSubscription.stripeSubscriptionId
        )
      );

    console.log('✅ Created subscription schedule for downgrade:', schedule.id);

    return {
      success: true,
      message: `Your subscription will downgrade to ${PRICING[tier as keyof typeof PRICING].name} on ${currentSubscription.currentPeriodEnd.toLocaleDateString()}`,
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
 * Create a Stripe Checkout session for upgrades or new subscriptions
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<OperationResult<{ url: string; id: string }>> {
  try {
    const { tier, userId, customerEmail, metadata = {}, redirectUrl, cancelUrl } = params;

    // Check if this is a downgrade
    const currentSubscription = await getUserSubscription(userId);
    const currentPrice = PRICING[currentSubscription.tier as keyof typeof PRICING]?.price || 0;
    const newPrice = PRICING[tier as keyof typeof PRICING]?.price;

    // If downgrading (new price < current price), use subscription schedule
    if (currentSubscription.tier !== SubscriptionTier.FREE && newPrice < currentPrice) {
      console.log('🔽 Detected downgrade, creating subscription schedule instead');
      return createSubscriptionSchedule(params);
    }

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return {
        success: false,
        message: `Invalid tier: ${tier}`,
      };
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, customerEmail);

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
        userId: userId,
        tier,
        ...metadata,
      },
      subscription_data: {
        metadata: {
          userId: userId,
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
 * Cancel user's active subscription (mark for cancellation at period end)
 */
export async function cancelUserSubscription(
  userId: string,
  stripeSubscriptionId: string
): Promise<OperationResult> {
  try {
    console.log('🔄 Canceling subscription via Stripe API:', stripeSubscriptionId);

    const currentSubscription = await getUserSubscription(userId);
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
        message: 'Subscription not found or does not belong to this user.',
      };
    }

    // Cancel subscription at period end via Stripe API
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    console.log('✅ Successfully canceled subscription in Stripe');

    // Update local database
    await db
      .update(userSubscriptions)
      .set({
        cancelAtPeriodEnd: 'true',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    console.log('✅ Successfully updated local subscription status');

    return {
      success: true,
      message:
        'Subscription has been successfully canceled. You will continue to have access until the end of your current billing period.',
    };
  } catch (error) {
    console.error('💥 Error in cancelUserSubscription:', error);
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
export async function reactivateUserSubscription(
  userId: string,
  stripeSubscriptionId: string
): Promise<OperationResult> {
  try {
    console.log('🔄 Reactivating subscription via Stripe API:', stripeSubscriptionId);

    const currentSubscription = await getUserSubscription(userId);
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
        message: 'Subscription not found or does not belong to this user.',
      };
    }

    // Reactivate subscription via Stripe API
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    console.log('✅ Successfully reactivated subscription in Stripe');

    // Update local database
    await db
      .update(userSubscriptions)
      .set({
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: 'false',
        canceledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    console.log('✅ Successfully updated local subscription status to active');

    return {
      success: true,
      message: 'Subscription has been successfully reactivated.',
    };
  } catch (error) {
    console.error('💥 Error in reactivateUserSubscription:', error);
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
  userId: string
): Promise<OperationResult<{ url: string }>> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user?.stripeCustomerId) {
      return {
        success: false,
        message: 'No Stripe customer found for this user.',
      };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
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
export async function cancelPendingDowngrade(userId: string): Promise<OperationResult> {
  try {
    console.log('🔄 Canceling pending downgrade for user:', userId);

    // Get current subscription
    const currentSubscription = await getUserSubscription(userId);

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

    // Find the pending schedule for this user (status can be 'not_started' or 'active')
    const pendingSchedule = schedules.data.find(
      (schedule) =>
        schedule.metadata?.userId === userId &&
        (schedule.status === 'active' || schedule.status === 'not_started')
    );

    if (!pendingSchedule) {
      console.error('❌ No pending schedule found for user:', userId);
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
      .update(userSubscriptions)
      .set({
        scheduledDowngradeTier: null,
        cancelAtPeriodEnd: 'false',
        canceledAt: null,
        status: SubscriptionStatus.ACTIVE,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.userId, userId));

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
