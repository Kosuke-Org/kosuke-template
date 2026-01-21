import { NextRequest, NextResponse } from 'next/server';

import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

import { getStripe } from '@/lib/billing/client';
import { SubscriptionTier, SubscriptionTierType } from '@/lib/billing/products';
import { db } from '@/lib/db';
import { SubscriptionStatus, orgSubscriptions } from '@/lib/db/schema';
import { getOrgById } from '@/lib/organizations';
import { getConfigOrEnv } from '@/lib/services/config-service';
import { CONFIG_KEYS } from '@/lib/services/constants';

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

    // Get webhook secret from database (with fallback to env var for backward compatibility)
    const webhookSecret = await getConfigOrEnv(CONFIG_KEYS.STRIPE_WEBHOOK_SECRET);

    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Initialize Stripe client and verify webhook signature
    const stripe = await getStripe();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
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
 * Helper: Get organizationId from subscription metadata with validation
 */
function getOrganizationId(subscription: Stripe.Subscription): string | null {
  const orgId = subscription.metadata?.organizationId as string;
  if (!orgId || typeof orgId !== 'string' || orgId.trim() === '') {
    console.error('❌ Invalid or missing organizationId in metadata:', subscription.metadata);
    return null;
  }
  return orgId;
}

/**
 * Helper: Get tier from subscription metadata with validation
 */
function getTier(subscription: Stripe.Subscription): string | null {
  const tier = subscription.metadata?.tier as SubscriptionTierType;
  if (!tier || typeof tier !== 'string') {
    console.error('❌ Invalid or missing tier in metadata:', subscription.metadata);
    return null;
  }

  // Validate against known subscription tiers
  const validTiers = Object.values(SubscriptionTier);
  if (!validTiers.includes(tier)) {
    console.error('❌ Invalid tier value in metadata:', tier, 'Valid tiers:', validTiers);
    return null;
  }

  return tier;
}

/**
 * Handle subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    const organizationId = getOrganizationId(subscription);
    const tier = getTier(subscription);

    if (!organizationId || !tier) {
      console.error('❌ Missing or invalid metadata in subscription.created:', subscription.id);
      return;
    }

    const stripe = await getStripe();

    // Verify organization exists to prevent orphaned subscription records
    const org = await getOrgById(organizationId);
    if (!org) {
      console.error(
        '❌ Cannot create subscription for non-existent organization:',
        organizationId,
        'subscription:',
        subscription.id
      );
      return;
    }

    const priceId = subscription.items.data[0]?.price.id;
    const subscriptionItem = subscription.items.data[0];

    if (!subscriptionItem) {
      console.error('❌ No subscription items found:', subscription.id);
      return;
    }

    // Get period dates from subscription item (most reliable source)
    const currentPeriodStart = subscriptionItem.current_period_start;
    const currentPeriodEnd = subscriptionItem.current_period_end;

    if (!currentPeriodStart || !currentPeriodEnd) {
      console.error('❌ Missing period dates in subscription item:', subscription.id);
      return;
    }

    // Check if this subscription already exists in the database
    // This prevents race conditions with seed scripts or manual DB operations
    const existingSubscriptions = await db
      .select()
      .from(orgSubscriptions)
      .where(eq(orgSubscriptions.organizationId, organizationId));

    const subscriptionExists = existingSubscriptions.some(
      (sub) => sub.stripeSubscriptionId === subscription.id
    );

    if (subscriptionExists) {
      console.log(
        `ℹ️  Subscription ${subscription.id} already exists in database, skipping creation`
      );
      return;
    }

    // Cancel existing active subscriptions to prevent duplicates
    // This handles all upgrade scenarios including Free → Paid upgrades
    for (const existing of existingSubscriptions) {
      if (existing.status === SubscriptionStatus.ACTIVE && existing.stripeSubscriptionId) {
        // Cancel in Stripe first
        try {
          await stripe.subscriptions.cancel(existing.stripeSubscriptionId);
          console.log(
            `✅ Canceled Stripe subscription ${existing.stripeSubscriptionId} for org upgrade`
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
          .update(orgSubscriptions)
          .set({
            status: 'canceled',
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(orgSubscriptions.id, existing.id));

        console.log(`✅ Canceled local subscription record ${existing.id} for org upgrade`);
      }
    }

    await db.insert(orgSubscriptions).values({
      organizationId,
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
    const subscriptionItem = subscription.items.data[0];

    if (!subscriptionItem) {
      console.error('❌ No subscription items found:', subscription.id);
      return;
    }

    const currentPeriodStart = subscriptionItem.current_period_start;
    const currentPeriodEnd = subscriptionItem.current_period_end;

    if (!currentPeriodStart || !currentPeriodEnd) {
      console.error('❌ Missing period dates in subscription item:', subscription.id);
      return;
    }

    await db
      .update(orgSubscriptions)
      .set({
        status: subscription.status,
        stripePriceId: priceId,
        currentPeriodStart: new Date(currentPeriodStart * 1000),
        currentPeriodEnd: new Date(currentPeriodEnd * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end ? 'true' : 'false',
        updatedAt: new Date(),
      })
      .where(eq(orgSubscriptions.stripeSubscriptionId, subscription.id));

    console.log('✅ Subscription updated in database:', subscription.id);
  } catch (error) {
    console.error('💥 Error handling subscription.updated:', error);
    throw error;
  }
}

/**
 * Handle subscription.deleted event
 * This event fires when a subscription is permanently deleted (e.g., customer deleted)
 * Unlike cancel_at_period_end, this is an immediate termination
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    // When a subscription is deleted, it's immediately terminated
    // Set cancelAtPeriodEnd to 'true' and currentPeriodEnd to now to reflect immediate cancellation
    const now = new Date();

    await db
      .update(orgSubscriptions)
      .set({
        status: 'canceled',
        cancelAtPeriodEnd: 'true',
        canceledAt: now,
        currentPeriodEnd: now, // Set to now to indicate immediate termination
        updatedAt: now,
      })
      .where(eq(orgSubscriptions.stripeSubscriptionId, subscription.id));

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
      .update(orgSubscriptions)
      .set({
        status: 'active',
        currentPeriodStart: new Date(invoice.period_start * 1000),
        currentPeriodEnd: new Date(invoice.period_end * 1000),
        updatedAt: new Date(),
      })
      .where(eq(orgSubscriptions.stripeSubscriptionId, subscriptionId));

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
      .update(orgSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(orgSubscriptions.stripeSubscriptionId, subscriptionId));

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
    const organizationId = schedule.metadata?.organizationId;
    const targetTier = schedule.metadata?.targetTier;

    if (!organizationId || !targetTier) {
      console.error('❌ Missing metadata in subscription_schedule.completed:', schedule.id);
      return;
    }

    // Verify organization exists
    const org = await getOrgById(organizationId);
    if (!org) {
      console.error(
        '❌ Cannot complete schedule for non-existent organization:',
        organizationId,
        'schedule:',
        schedule.id
      );
      return;
    }

    console.log(
      `✅ Subscription schedule completed for organization ${organizationId}, downgrading to ${targetTier}`
    );

    // The schedule automatically creates a new subscription when it completes
    // The subscription.created event will handle creating the new subscription record
    // We just need to clear the scheduledDowngradeTier field from the old subscription

    const results = await db
      .select()
      .from(orgSubscriptions)
      .where(eq(orgSubscriptions.organizationId, organizationId))
      .limit(1);
    const currentSub = results[0];

    if (currentSub) {
      await db
        .update(orgSubscriptions)
        .set({
          scheduledDowngradeTier: null,
          updatedAt: new Date(),
        })
        .where(eq(orgSubscriptions.id, currentSub.id));
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
    const organizationId = schedule.metadata?.organizationId;
    const currentSubscriptionId = schedule.metadata?.currentSubscriptionId;

    if (!organizationId || !currentSubscriptionId) {
      console.error('❌ Missing metadata in subscription_schedule.canceled:', schedule.id);
      return;
    }

    console.log(`✅ Subscription schedule canceled for organization ${organizationId}`);

    // Remove the scheduled downgrade and reactivate the current subscription
    await db
      .update(orgSubscriptions)
      .set({
        scheduledDowngradeTier: null,
        cancelAtPeriodEnd: 'false',
        canceledAt: null,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(orgSubscriptions.stripeSubscriptionId, currentSubscriptionId));

    console.log('✅ Pending downgrade removed, current subscription reactivated');
  } catch (error) {
    console.error('💥 Error handling subscription_schedule.canceled:', error);
    throw error;
  }
}
