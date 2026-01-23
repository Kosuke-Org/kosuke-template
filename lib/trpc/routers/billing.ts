import { TRPCError } from '@trpc/server';

import {
  BILLING_URLS,
  cancelOrgSubscription,
  cancelPendingDowngrade,
  createCheckoutSession,
  createCustomerPortalSession,
  getOrgSubscription,
  getPricingFromStripe,
  getSubscriptionEligibility,
  reactivateOrgSubscription,
} from '@/lib/billing';
import { syncOrgSubscriptionFromStripe, syncStaleSubscriptions } from '@/lib/billing/stripe-sync';
import { isStripeApiKeyConfigured } from '@/lib/services/config-service';
import {
  canSubscribeSchema,
  createCheckoutSchema,
  getPricingSchema,
  getStatusSchema,
  syncActionSchema,
} from '@/lib/trpc/schemas/billing';
import { handleApiError } from '@/lib/utils';

import { orgOwnerProcedure, orgProcedure, protectedProcedure, router } from '../init';

/**
 * Billing Router
 * Handles all subscription and billing operations via tRPC
 */

/**
 * Organization owner procedure - middleware that checks for owner role
 */
export const billingRouter = router({
  /**
   * Check if Stripe API key is configured
   * Returns boolean indicating if billing features are available
   */
  isConfigured: protectedProcedure.query(async () => {
    const isConfigured = await isStripeApiKeyConfigured();

    return {
      isConfigured,
    };
  }),

  /**
   * Get pricing information from Stripe
   * Fetches all active prices using lookup keys
   */
  getPricing: protectedProcedure.input(getPricingSchema).query(async () => {
    try {
      return await getPricingFromStripe();
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Get organization's subscription status and details
   */
  getStatus: orgProcedure.input(getStatusSchema).query(async ({ ctx }) => {
    const subscriptionInfo = await getOrgSubscription(ctx.organizationId);

    return {
      tier: subscriptionInfo.tier,
      status: subscriptionInfo.status,
      currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
      activeSubscription: subscriptionInfo.activeSubscription,
    };
  }),

  /**
   * Check if organization can subscribe or upgrade
   */
  canSubscribe: orgProcedure.input(canSubscribeSchema).query(async ({ ctx }) => {
    const currentSubscription = await getOrgSubscription(ctx.organizationId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    return {
      canSubscribe: eligibility.canCreateNew || eligibility.canUpgrade,
      canCreateNew: eligibility.canCreateNew,
      canUpgrade: eligibility.canUpgrade,
      canReactivate: eligibility.canReactivate,
      canCancel: eligibility.canCancel,
      reason: eligibility.reason || null,
      currentSubscription: {
        tier: currentSubscription.tier,
        status: currentSubscription.status,
        currentPeriodEnd: currentSubscription.currentPeriodEnd,
        isInGracePeriod:
          currentSubscription.status === 'canceled' &&
          currentSubscription.currentPeriodEnd &&
          new Date() < currentSubscription.currentPeriodEnd,
      },
    };
  }),

  /**
   * Create Stripe checkout session for subscription (owner only)
   */
  createCheckout: orgOwnerProcedure.input(createCheckoutSchema).mutation(async ({ input, ctx }) => {
    const currentSubscription = await getOrgSubscription(ctx.organizationId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    if (!eligibility.canCreateNew && !eligibility.canUpgrade) {
      throw new TRPCError({
        code: 'CONFLICT',
        message: eligibility.reason || 'Cannot create subscription',
      });
    }

    const user = await ctx.getUser();
    const customerEmail = user?.email;

    if (!customerEmail) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No email found for user',
      });
    }

    // Use client's redirectUrl if provided (embedded mode with parent URL)
    // Otherwise fallback to env variables (standalone mode)
    let redirectUrl: string;
    let cancelUrl: string;

    if (input.redirectUrl) {
      // This is the name of the query param that will be used to redirect the user back to the iframe
      const IFRAME_REDIRECT_URL_PARAM = 'iframeRedirectUrl'; // DO NOT MODIFY
      const successUrl = new URL(input.redirectUrl);
      successUrl.searchParams.set(IFRAME_REDIRECT_URL_PARAM, BILLING_URLS.success);
      redirectUrl = successUrl.toString();

      const cancelUrlObj = new URL(input.redirectUrl);
      cancelUrlObj.searchParams.set(IFRAME_REDIRECT_URL_PARAM, BILLING_URLS.cancel);
      cancelUrl = cancelUrlObj.toString();
    } else {
      redirectUrl = BILLING_URLS.success;
      cancelUrl = BILLING_URLS.cancel;
    }

    const result = await createCheckoutSession({
      tier: input.tier,
      organizationId: ctx.organizationId,
      customerEmail,
      redirectUrl,
      cancelUrl,
    });

    if (!result.success) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: result.message,
      });
    }

    return {
      checkoutUrl: result.data!.url,
      sessionId: result.data!.id,
    };
  }),

  /**
   * Cancel organization's active subscription (marks for cancellation at period end, owner only)
   */
  cancel: orgOwnerProcedure.mutation(async ({ ctx }) => {
    const subscriptionInfo = await getOrgSubscription(ctx.organizationId);
    const eligibility = getSubscriptionEligibility(subscriptionInfo);

    if (!eligibility.canCancel) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Subscription cannot be canceled at this time',
      });
    }

    if (!subscriptionInfo.activeSubscription?.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No active subscription found',
      });
    }

    const result = await cancelOrgSubscription(
      ctx.organizationId,
      subscriptionInfo.activeSubscription.stripeSubscriptionId
    );

    if (!result.success) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: result.message,
      });
    }

    return {
      success: true,
      message: result.message,
    };
  }),

  /**
   * Reactivate a canceled subscription (removes cancellation, owner only)
   */
  reactivate: orgOwnerProcedure.mutation(async ({ ctx }) => {
    const subscriptionInfo = await getOrgSubscription(ctx.organizationId);
    const eligibility = getSubscriptionEligibility(subscriptionInfo);

    if (!eligibility.canReactivate) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Subscription cannot be reactivated at this time',
      });
    }

    if (!subscriptionInfo.activeSubscription?.stripeSubscriptionId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'No subscription found to reactivate',
      });
    }

    const result = await reactivateOrgSubscription(
      ctx.organizationId,
      subscriptionInfo.activeSubscription.stripeSubscriptionId
    );

    if (!result.success) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: result.message,
      });
    }

    return {
      success: true,
      message: result.message,
      subscription: {
        id: subscriptionInfo.activeSubscription.stripeSubscriptionId,
        tier: subscriptionInfo.activeSubscription.tier,
        status: 'active',
      },
    };
  }),

  /**
   * Create Stripe Customer Portal session for subscription management (owner only)
   */
  createPortalSession: orgOwnerProcedure.mutation(async ({ ctx }) => {
    const result = await createCustomerPortalSession(ctx.organizationId);

    if (!result.success) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: result.message,
      });
    }

    return {
      url: result.data!.url,
    };
  }),

  /**
   * Sync subscription from Stripe (owner utility)
   */
  sync: orgOwnerProcedure.input(syncActionSchema).mutation(async ({ input, ctx }) => {
    switch (input.action) {
      case 'user': {
        const result = await syncOrgSubscriptionFromStripe(ctx.organizationId);
        return {
          success: result.success,
          message: result.message,
          action: 'org_sync',
          subscription: result.subscription,
        };
      }
      case 'stale': {
        const result = await syncStaleSubscriptions(24);
        return {
          success: true,
          message: `Synced ${result.syncedCount} subscriptions`,
          syncedCount: result.syncedCount,
          errors: result.errors,
          action: 'stale_sync',
        };
      }
      case 'emergency': {
        const result = await syncStaleSubscriptions(1); // Sync all subscriptions
        return {
          success: true,
          message: `Emergency sync: ${result.syncedCount} synced`,
          syncedCount: result.syncedCount,
          errors: result.errors,
          action: 'emergency_sync',
        };
      }
    }
  }),

  /**
   * Cancel pending subscription downgrade (owner only)
   */
  cancelDowngrade: orgOwnerProcedure.mutation(async ({ ctx }) => {
    const result = await cancelPendingDowngrade(ctx.organizationId);

    if (!result.success) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: result.message,
      });
    }

    return {
      success: true,
      message: result.message,
    };
  }),
});
