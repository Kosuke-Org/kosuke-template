import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/billing/client';
import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * Processes subscription lifecycle events from Stripe
 *
 * Endpoint: /api/billing/webhook
 * Events handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.paid
 * - invoice.payment_failed
 * - subscription_schedule.completed (for downgrades)
 * - subscription_schedule.canceled (when user cancels pending downgrade)
 */

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('✅ Stripe webhook event:', event.type, event.id);

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;
      case 'subscription_schedule.completed':
        await handleSubscriptionScheduleCompleted(event.data.object);
        break;
      case 'subscription_schedule.canceled':
        await handleSubscriptionScheduleCanceled(event.data.object);
        break;
      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('💥 Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Helper: Get clerkUserId from subscription metadata
 */
function getClerkUserId(subscription: Stripe.Subscription): string | null {
  return (subscription.metadata?.clerkUserId as string) || null;
}

/**
 * Helper: Get tier from subscription metadata
 */
function getTier(subscription: Stripe.Subscription): string | null {
  return (subscription.metadata?.tier as string) || null;
}

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const clerkUserId = getClerkUserId(subscription);
    const tier = getTier(subscription);

    if (!clerkUserId || !tier) {
      console.error('❌ Missing metadata in subscription.created:', subscription.id);
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;

    // Stripe API includes period fields on subscriptions, but TypeScript types don't
    // See: https://docs.stripe.com/api/subscriptions/object
    // @ts-expect-error - current_period_start exists in actual API but not in TS types
    const currentPeriodStart = subscription.current_period_start;
    // @ts-expect-error - current_period_end exists in actual API but not in TS types
    const currentPeriodEnd = subscription.current_period_end;

    // Before creating new subscription, mark any existing active subscriptions as replaced
    // This prevents duplicate active subscriptions when upgrading
    const existingSubscriptions = await db.query.userSubscriptions.findMany({
      where: eq(userSubscriptions.clerkUserId, clerkUserId),
    });

    // Cancel existing active subscriptions (except free tier)
    for (const existing of existingSubscriptions) {
      if (
        existing.tier !== 'free' &&
        existing.status === 'active' &&
        existing.stripeSubscriptionId
      ) {
        // Cancel in Stripe first
        try {
          await stripe.subscriptions.cancel(existing.stripeSubscriptionId);
          console.log(
            `✅ Canceled Stripe subscription ${existing.stripeSubscriptionId} for user upgrade`
          );
        } catch (error) {
          console.error(
            `⚠️ Failed to cancel Stripe subscription ${existing.stripeSubscriptionId}:`,
            error
          );
          // Continue anyway to update local database
        }

        // Update local database
        await db
          .update(userSubscriptions)
          .set({
            status: 'canceled',
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.id, existing.id));

        console.log(`✅ Canceled local subscription record ${existing.id} for user upgrade`);
      }
    }

    await db.insert(userSubscriptions).values({
      clerkUserId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: priceId,
      status: subscription.status,
      tier,
      currentPeriodStart: new Date(currentPeriodStart * 1000),
      currentPeriodEnd: new Date(currentPeriodEnd * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end ? 'true' : 'false',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('✅ Subscription created in database:', subscription.id);
  } catch (error) {
    console.error('💥 Error handling subscription.created:', error);
    throw error;
  }
}

/**
 * Handle subscription.updated event
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const priceId = subscription.items.data[0]?.price.id;

    // Stripe API includes period fields on subscriptions, but TypeScript types don't
    // @ts-expect-error - current_period_start exists in actual API but not in TS types
    const currentPeriodStart = subscription.current_period_start;
    // @ts-expect-error - current_period_end exists in actual API but not in TS types
    const currentPeriodEnd = subscription.current_period_end;

    await db
      .update(userSubscriptions)
      .set({
        status: subscription.status,
        stripePriceId: priceId,
        currentPeriodStart: new Date(currentPeriodStart * 1000),
        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end ? 'true' : 'false',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));

    console.log('✅ Subscription updated in database:', subscription.id);
  } catch (error) {
    console.error('💥 Error handling subscription.updated:', error);
    throw error;
  }
}

/**
 * Handle subscription.deleted event
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    await db
      .update(userSubscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));

    console.log('✅ Subscription marked as deleted in database:', subscription.id);
  } catch (error) {
    console.error('💥 Error handling subscription.deleted:', error);
    throw error;
  }
}

/**
 * Handle invoice.paid event (successful renewal)
 */
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    // @ts-expect-error - subscription exists in webhook events but not in Invoice type
    const sub = invoice.subscription;
    if (!sub) return;

    const subscriptionId = typeof sub === 'string' ? sub : sub.id;

    // Update subscription with period info from invoice + ensure active status
    await db
      .update(userSubscriptions)
      .set({
        status: 'active',
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));

    console.log('✅ Invoice paid, subscription confirmed active:', subscriptionId);
  } catch (error) {
    console.error('💥 Error handling invoice.paid:', error);
    throw error;
  }
}

/**
 * Handle invoice.payment_failed event
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    // Stripe webhook events include subscription property but TypeScript definitions don't
    // @ts-expect-error - subscription exists in webhook events but not in Invoice type
    const sub = invoice.subscription;
    if (!sub) return;

    const subscriptionId = typeof sub === 'string' ? sub : sub.id;

    // Mark subscription as past_due
    await db
      .update(userSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));

    console.log('⚠️ Payment failed for subscription:', subscriptionId);
  } catch (error) {
    console.error('💥 Error handling invoice.payment_failed:', error);
    throw error;
  }
}

/**
 * Handle subscription_schedule.completed event
 * This fires when a scheduled downgrade is activated (e.g., Business → Pro)
 */
async function handleSubscriptionScheduleCompleted(schedule: Stripe.SubscriptionSchedule) {
  try {
    const clerkUserId = schedule.metadata?.clerkUserId;
    const targetTier = schedule.metadata?.targetTier;

    if (!clerkUserId || !targetTier) {
      console.error('❌ Missing metadata in subscription_schedule.completed:', schedule.id);
      return;
    }

    console.log(
      `✅ Subscription schedule completed for user ${clerkUserId}, downgrading to ${targetTier}`
    );

    // The schedule automatically creates a new subscription when it completes
    // The subscription.created event will handle creating the new subscription record
    // We just need to clear the scheduledDowngradeTier field from the old subscription

    const currentSub = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.clerkUserId, clerkUserId),
    });

    if (currentSub) {
      await db
        .update(userSubscriptions)
        .set({
          scheduledDowngradeTier: null,
          updatedAt: new Date(),
        })
        .where(eq(userSubscriptions.id, currentSub.id));
    }

    console.log('✅ Scheduled downgrade completed successfully');
  } catch (error) {
    console.error('💥 Error handling subscription_schedule.completed:', error);
    throw error;
  }
}

/**
 * Handle subscription_schedule.canceled event
 * This fires when a pending downgrade is canceled by the user
 */
async function handleSubscriptionScheduleCanceled(schedule: Stripe.SubscriptionSchedule) {
  try {
    const clerkUserId = schedule.metadata?.clerkUserId;
    const currentSubscriptionId = schedule.metadata?.currentSubscriptionId;

    if (!clerkUserId || !currentSubscriptionId) {
      console.error('❌ Missing metadata in subscription_schedule.canceled:', schedule.id);
      return;
    }

    console.log(`✅ Subscription schedule canceled for user ${clerkUserId}`);

    // Remove the scheduled downgrade and reactivate the current subscription
    await db
      .update(userSubscriptions)
      .set({
        scheduledDowngradeTier: null,
        cancelAtPeriodEnd: 'false',
        canceledAt: null,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, currentSubscriptionId));

    console.log('✅ Pending downgrade removed, current subscription reactivated');
  } catch (error) {
    console.error('💥 Error handling subscription_schedule.canceled:', error);
    throw error;
  }
}
