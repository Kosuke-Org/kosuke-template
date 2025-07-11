import { NextRequest, NextResponse } from 'next/server';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('polar-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Validate webhook signature
    const event = validateEvent(
      rawBody,
      { 'polar-signature': signature },
      process.env.POLAR_WEBHOOK_SECRET!
    );

    console.log('Received webhook event:', event.type);

    switch (event.type) {
      case 'checkout.created':
        await handleCheckoutCreated(event.data);
        break;
      case 'checkout.updated':
        await handleCheckoutUpdated(event.data);
        break;
      case 'order.created':
        await handleOrderCreated(event.data);
        break;
      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;
      default:
        console.log('Unhandled event type:', event.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleCheckoutCreated(data: unknown) {
  console.log('Checkout created:', (data as Record<string, unknown>).id);
  // Handle checkout creation if needed
}

async function handleCheckoutUpdated(data: unknown) {
  console.log('Checkout updated:', (data as Record<string, unknown>).id);
  // Handle checkout updates if needed
}

async function handleOrderCreated(data: unknown) {
  console.log('Order created:', (data as Record<string, unknown>).id);
  // Handle order creation if needed
}

async function handleSubscriptionCreated(data: unknown) {
  const eventData = data as Record<string, unknown>;
  console.log('Subscription created:', eventData.id);

  try {
    const metadata = eventData.metadata as Record<string, unknown> | undefined;
    const userId = metadata?.userId;
    const tier = metadata?.tier;

    if (!userId || !tier) {
      console.error('Missing userId or tier in subscription metadata');
      return;
    }

    // Update user subscription info
    await db
      .update(users)
      .set({
        subscriptionTier: tier as string,
        subscriptionStatus: 'active',
        subscriptionId: eventData.id as string,
        currentPeriodEnd: new Date(
          (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
        ),
      })
      .where(eq(users.id, parseInt(userId as string)));

    // Create subscription record
    await db.insert(subscriptions).values({
      userId: parseInt(userId as string),
      subscriptionId: eventData.id as string,
      productId: eventData.productId as string,
      status: 'active',
      tier: tier as string,
      currentPeriodStart: new Date(
        (eventData.currentPeriodStart as string) || (eventData.startedAt as string)
      ),
      currentPeriodEnd: new Date(
        (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
      ),
    });

    console.log(`User ${userId} subscription created successfully`);
  } catch (error) {
    console.error('Error handling subscription created:', error);
  }
}

async function handleSubscriptionUpdated(data: unknown) {
  const eventData = data as Record<string, unknown>;
  console.log('Subscription updated:', eventData.id);

  try {
    const metadata = eventData.metadata as Record<string, unknown> | undefined;
    const userId = metadata?.userId;

    if (!userId) {
      console.error('Missing userId in subscription metadata');
      return;
    }

    // Update user subscription info
    await db
      .update(users)
      .set({
        subscriptionStatus: eventData.status as string,
        currentPeriodEnd: new Date(
          (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
        ),
      })
      .where(eq(users.id, parseInt(userId as string)));

    // Update subscription record
    await db
      .update(subscriptions)
      .set({
        status: eventData.status as string,
        currentPeriodStart: new Date(
          (eventData.currentPeriodStart as string) || (eventData.startedAt as string)
        ),
        currentPeriodEnd: new Date(
          (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
        ),
      })
      .where(eq(subscriptions.subscriptionId, eventData.id as string));

    console.log(`User ${userId} subscription updated successfully`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

async function handleSubscriptionCanceled(data: unknown) {
  const eventData = data as Record<string, unknown>;
  console.log('Subscription canceled:', eventData.id);

  try {
    const metadata = eventData.metadata as Record<string, unknown> | undefined;
    const userId = metadata?.userId;

    if (!userId) {
      console.error('Missing userId in subscription metadata');
      return;
    }

    // Update user subscription info
    await db
      .update(users)
      .set({
        subscriptionStatus: 'canceled',
        currentPeriodEnd: new Date(
          (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
        ),
      })
      .where(eq(users.id, parseInt(userId as string)));

    // Update subscription record
    await db
      .update(subscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        currentPeriodEnd: new Date(
          (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
        ),
      })
      .where(eq(subscriptions.subscriptionId, eventData.id as string));

    console.log(`User ${userId} subscription canceled successfully`);
  } catch (error) {
    console.error('Error handling subscription canceled:', error);
  }
}
