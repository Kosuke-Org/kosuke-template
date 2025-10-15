import { router, protectedProcedure } from '../init';
import { TRPCError } from '@trpc/server';
import {
  getUserSubscription,
  getSubscriptionEligibility,
  createCheckoutSession,
  cancelUserSubscription,
  reactivateUserSubscription,
  createCustomerPortalSession,
  cancelPendingDowngrade,
} from '@/lib/billing';
import { syncUserSubscriptionFromStripe, syncStaleSubscriptions } from '@/lib/billing/stripe-sync';
import { createCheckoutSchema, syncActionSchema } from '../schemas/billing';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Billing Router
 * Handles all subscription and billing operations via tRPC
 */
export const billingRouter = router({
  /**
   * Get current user's subscription status and details
   */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const subscriptionInfo = await getUserSubscription(ctx.userId);

    return {
      tier: subscriptionInfo.tier,
      status: subscriptionInfo.status,
      currentPeriodEnd: subscriptionInfo.currentPeriodEnd,
      activeSubscription: subscriptionInfo.activeSubscription,
    };
  }),

  /**
   * Check if user can subscribe or upgrade
   */
  canSubscribe: protectedProcedure.query(async ({ ctx }) => {
    const currentSubscription = await getUserSubscription(ctx.userId);
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
   * Create Stripe checkout session for subscription
   */
  createCheckout: protectedProcedure
    .input(createCheckoutSchema)
    .mutation(async ({ input, ctx }) => {
      const currentSubscription = await getUserSubscription(ctx.userId);
      const eligibility = getSubscriptionEligibility(currentSubscription);

      if (!eligibility.canCreateNew && !eligibility.canUpgrade) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: eligibility.reason || 'Cannot create subscription',
        });
      }

      // Get user email from Clerk
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(ctx.userId);
      const customerEmail = user.emailAddresses[0]?.emailAddress;

      if (!customerEmail) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'No email found for user',
        });
      }

      const result = await createCheckoutSession({
        tier: input.tier,
        userId: ctx.userId,
        customerEmail,
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
   * Cancel user's active subscription (marks for cancellation at period end)
   */
  cancel: protectedProcedure.mutation(async ({ ctx }) => {
    const subscriptionInfo = await getUserSubscription(ctx.userId);
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

    const result = await cancelUserSubscription(
      ctx.userId,
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
   * Reactivate a canceled subscription (removes cancellation)
   */
  reactivate: protectedProcedure.mutation(async ({ ctx }) => {
    const subscriptionInfo = await getUserSubscription(ctx.userId);
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

    const result = await reactivateUserSubscription(
      ctx.userId,
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
   * Create Stripe Customer Portal session for subscription management
   */
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await createCustomerPortalSession(ctx.userId);

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
   * Sync subscription from Stripe (admin/debug utility)
   */
  sync: protectedProcedure.input(syncActionSchema).mutation(async ({ input, ctx }) => {
    switch (input.action) {
      case 'user': {
        const result = await syncUserSubscriptionFromStripe(ctx.userId);
        return {
          success: result.success,
          message: result.message,
          action: 'user_sync',
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
   * Get sync status information
   */
  getSyncStatus: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getUserSubscription(ctx.userId);

    return {
      success: true,
      message: 'Sync status retrieved',
      user: {
        clerkId: ctx.userId,
        currentTier: subscription.tier,
        lastUpdated: subscription.activeSubscription?.updatedAt || new Date(),
      },
      availableActions: [
        { action: 'user', description: 'Sync current user subscription from Stripe' },
        { action: 'stale', description: 'Sync all stale subscriptions (admin)' },
        { action: 'emergency', description: 'Emergency full sync (admin)' },
      ],
    };
  }),

  /**
   * Cancel pending subscription downgrade
   */
  cancelDowngrade: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await cancelPendingDowngrade(ctx.userId);

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
