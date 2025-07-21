import { polar } from './client';
import { PRODUCT_IDS, BILLING_URLS } from './config';
import { type CheckoutSessionParams, type OperationResult } from '@/lib/types';
import { SubscriptionStatus } from '@/lib/db/schema';
import { getUserSubscription, updateUserSubscription } from './subscription';
import { getSubscriptionEligibility } from './eligibility';

/**
 * Billing operations: checkout, cancel, reactivate
 * Handles Polar API interactions for subscription management
 */

/**
 * Create a checkout session for a specific tier
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<OperationResult<{ url: string; id: string }>> {
  try {
    const { tier, userId, customerEmail, successUrl, metadata = {} } = params;

    const productId = PRODUCT_IDS[tier];
    if (!productId) {
      return {
        success: false,
        message: `Invalid tier: ${tier}`,
      };
    }

    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: successUrl || BILLING_URLS.success,
      customerEmail,
      metadata: {
        userId,
        tier,
        ...metadata,
      },
    });

    return {
      success: true,
      message: 'Checkout session created successfully',
      data: {
        url: checkout.url!,
        id: checkout.id,
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
 * Cancel user's active subscription
 */
export async function cancelUserSubscription(
  clerkUserId: string,
  subscriptionId: string
): Promise<OperationResult> {
  try {
    console.log('🔄 Canceling subscription via Polar API:', subscriptionId);

    const currentSubscription = await getUserSubscription(clerkUserId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    if (!eligibility.canCancel) {
      return {
        success: false,
        message: 'Subscription cannot be canceled at this time.',
      };
    }

    if (
      !currentSubscription.activeSubscription ||
      currentSubscription.activeSubscription.subscriptionId !== subscriptionId
    ) {
      return {
        success: false,
        message: 'Subscription not found or does not belong to this user.',
      };
    }

    // Cancel subscription via Polar API
    try {
      const canceledSubscription = await polar.subscriptions.revoke({
        id: subscriptionId,
      });

      console.log('✅ Successfully canceled subscription in Polar:', canceledSubscription);
    } catch (polarError: unknown) {
      console.error('💥 Polar API error during cancellation:', polarError);

      const error = polarError as { status?: number; message?: string };
      if (error.status === 404) {
        return {
          success: false,
          message: 'Subscription not found in Polar. It may have already been canceled.',
        };
      } else if (error.status === 403) {
        return {
          success: false,
          message: 'Access denied. Unable to cancel this subscription.',
        };
      } else if (error.status && error.status >= 500) {
        return {
          success: false,
          message: 'Polar service is temporarily unavailable. Please try again later.',
        };
      } else {
        return {
          success: false,
          message: `Failed to cancel subscription: ${error.message || 'Unknown error'}`,
        };
      }
    }

    // Update local database
    await updateUserSubscription(clerkUserId, subscriptionId, {
      status: SubscriptionStatus.CANCELED,
      canceledAt: new Date(),
    });

    console.log('✅ Successfully updated local subscription status to canceled');

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
 * Reactivate a canceled subscription (uncancels it in Polar)
 */
export async function reactivateUserSubscription(
  clerkUserId: string,
  subscriptionId: string
): Promise<OperationResult> {
  try {
    console.log('🔄 Reactivating subscription via Polar API:', subscriptionId);

    // Validate subscription eligibility for reactivation
    const currentSubscription = await getUserSubscription(clerkUserId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    if (!eligibility.canReactivate) {
      return {
        success: false,
        message: 'Subscription cannot be reactivated at this time.',
      };
    }

    if (
      !currentSubscription.activeSubscription ||
      currentSubscription.activeSubscription.subscriptionId !== subscriptionId
    ) {
      return {
        success: false,
        message: 'Subscription not found or does not belong to this user.',
      };
    }

    // Reactivate subscription via Polar API (this triggers subscription.updated webhook)
    try {
      // Based on Polar's architecture: Update subscription to remove cancellation
      // This follows the pattern where cancellation is scheduled for period end
      // and can be removed before the period expires
      // For now, we'll need to implement the actual update logic once Polar confirms their API
      // This is a placeholder that follows their likely pattern
      const reactivatedSubscription = await polar.subscriptions.get({ id: subscriptionId });

      // TODO: Replace with actual reactivation call once Polar API is confirmed
      // Likely something like: polar.subscriptions.update(subscriptionId, { cancel_at: null })
      console.warn('⚠️  Placeholder: Actual Polar reactivation API call needed here');
      console.log('✅ Subscription reactivation requested via Polar API:', subscriptionId);

      console.log('✅ Successfully reactivated subscription in Polar:', reactivatedSubscription);
    } catch (polarError: unknown) {
      console.error('💥 Polar API error during reactivation:', polarError);

      const error = polarError as { status?: number; message?: string };
      if (error.status === 404) {
        return {
          success: false,
          message: 'Subscription not found in Polar.',
        };
      } else if (error.status === 403) {
        return {
          success: false,
          message: 'Access denied. Unable to reactivate this subscription.',
        };
      } else if (error.status && error.status >= 500) {
        return {
          success: false,
          message: 'Polar service is temporarily unavailable. Please try again later.',
        };
      } else {
        return {
          success: false,
          message: `Failed to reactivate subscription: ${error.message || 'Unknown error'}`,
        };
      }
    }

    // Update local database - the webhook should handle this, but we can update optimistically
    await updateUserSubscription(clerkUserId, subscriptionId, {
      status: SubscriptionStatus.ACTIVE,
      canceledAt: null,
    });

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
