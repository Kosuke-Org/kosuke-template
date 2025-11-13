import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { eq, desc, lt } from 'drizzle-orm';
import { stripe } from './client';
import Stripe from 'stripe';

/**
 * Stripe sync utilities
 * Periodic reconciliation between Stripe and local database
 */

/**
 * Sync a single user's subscription from Stripe
 */
export async function syncUserSubscriptionFromStripe(userId: string): Promise<{
  success: boolean;
  message: string;
  subscription?: Stripe.Subscription;
}> {
  try {
    console.log('🔄 Syncing subscription from Stripe for user:', userId);

    const localSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.userId, userId),
      orderBy: [desc(userSubscriptions.createdAt)],
    });

    if (!localSubscription?.stripeSubscriptionId) {
      return {
        success: true,
        message: 'No active subscription to sync',
      };
    }

    // Fetch from Stripe
    let stripeSubscription: Stripe.Subscription;
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(
        localSubscription.stripeSubscriptionId
      );
    } catch (error) {
      // Check if it's a Stripe error with resource_missing code
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'resource_missing'
      ) {
        // Subscription deleted in Stripe
        await db
          .update(userSubscriptions)
          .set({
            status: 'canceled',
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            eq(userSubscriptions.stripeSubscriptionId, localSubscription.stripeSubscriptionId!)
          );

        return {
          success: true,
          message: 'Subscription no longer exists in Stripe - marked as canceled',
        };
      }
      throw error;
    }

    // Update local database from Stripe subscription data
    // Stripe API includes period fields on subscriptions, but TypeScript types don't
    const priceId = stripeSubscription.items.data[0]?.price.id;

    // @ts-expect-error - current_period_start exists in actual API but not in TS types
    const currentPeriodStart = stripeSubscription.current_period_start;
    // @ts-expect-error - current_period_end exists in actual API but not in TS types
    const currentPeriodEnd = stripeSubscription.current_period_end;

    await db
      .update(userSubscriptions)
      .set({
        status: stripeSubscription.status,
        stripePriceId: priceId,
        currentPeriodStart: new Date(currentPeriodStart * 1000),
        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ? 'true' : 'false',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, localSubscription.stripeSubscriptionId!));

    console.log('✅ Successfully synced subscription from Stripe');

    return {
      success: true,
      message: 'Subscription synced successfully',
      subscription: stripeSubscription,
    };
  } catch (error) {
    console.error('💥 Error syncing subscription from Stripe:', error);
    return {
      success: false,
      message: `Failed to sync: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Sync stale subscriptions (older than X hours)
 */
export async function syncStaleSubscriptions(staleHours: number = 24): Promise<{
  syncedCount: number;
  errors: string[];
}> {
  try {
    console.log(`🔄 Syncing subscriptions older than ${staleHours} hours`);

    const staleThreshold = new Date(Date.now() - staleHours * 60 * 60 * 1000);

    const staleSubscriptions = await db.query.userSubscriptions.findMany({
      where: lt(userSubscriptions.updatedAt, staleThreshold),
      limit: 50,
    });

    const errors: string[] = [];
    let syncedCount = 0;

    for (const subscription of staleSubscriptions) {
      try {
        const result = await syncUserSubscriptionFromStripe(subscription.userId);
        if (result.success) {
          syncedCount++;
        } else {
          errors.push(`${subscription.userId}: ${result.message}`);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errors.push(
          `${subscription.userId}: ${error instanceof Error ? error.message : 'Unknown'}`
        );
      }
    }

    console.log(`✅ Synced ${syncedCount}/${staleSubscriptions.length} subscriptions`);

    return { syncedCount, errors };
  } catch (error) {
    console.error('💥 Error in syncStaleSubscriptions:', error);
    return {
      syncedCount: 0,
      errors: [`Global error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}
