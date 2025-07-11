import { NextRequest, NextResponse } from 'next/server';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  console.log('🎯 WEBHOOK RECEIVED - Starting processing...');

  try {
    const rawBody = await request.text();
    const signature = request.headers.get('webhook-signature');
    const timestamp = request.headers.get('webhook-timestamp');
    const webhookId = request.headers.get('webhook-id');

    console.log('📋 Webhook Details:');
    console.log('- Raw body length:', rawBody.length);
    console.log('- Signature present:', !!signature);
    console.log('- Timestamp present:', !!timestamp);
    console.log('- Webhook ID present:', !!webhookId);
    console.log('- Headers:', Object.fromEntries(request.headers.entries()));

    if (!signature) {
      console.error('❌ MISSING SIGNATURE');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Log environment details
    console.log('🔧 Environment:');
    console.log('- POLAR_WEBHOOK_SECRET present:', !!process.env.POLAR_WEBHOOK_SECRET);
    console.log('- POLAR_ENVIRONMENT:', process.env.POLAR_ENVIRONMENT);

    // Validate webhook signature with all required headers
    console.log('🔐 Validating webhook signature...');

    // Try different header formats that the Polar SDK might expect
    const headerVariants = [
      // Standard webhook headers
      {
        'webhook-signature': signature,
        'webhook-timestamp': timestamp,
        'webhook-id': webhookId,
      },
      // Alternative naming conventions
      {
        'polar-signature': signature,
        'polar-timestamp': timestamp,
        'polar-id': webhookId,
      },
      // Just signature
      {
        'webhook-signature': signature,
      },
    ];

    let event;
    let lastError;

    for (const [index, headers] of headerVariants.entries()) {
      // Filter out null/undefined values
      const cleanHeaders = Object.fromEntries(
        Object.entries(headers).filter(([, value]) => value !== null && value !== undefined)
      );

      console.log(`🔄 Trying header variant ${index + 1}:`, cleanHeaders);

      try {
        event = validateEvent(rawBody, cleanHeaders, process.env.POLAR_WEBHOOK_SECRET!);
        console.log('✅ Signature validation successful with variant', index + 1);
        break;
      } catch (error) {
        console.log(
          `❌ Variant ${index + 1} failed:`,
          error instanceof Error ? error.message : 'Unknown error'
        );
        lastError = error;
        continue;
      }
    }

    if (!event) {
      console.error('💥 All header variants failed. Last error:', lastError);
      throw lastError;
    }

    console.log('✅ Signature validation successful');
    console.log('🔔 Event Details:');
    console.log('- Type:', event.type);
    console.log('- Full event data:', JSON.stringify(event, null, 2));

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
      case 'order.paid':
        await handleOrderPaid(event.data);
        break;
      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;
      case 'subscription.active':
        await handleSubscriptionActive(event.data);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;
      case 'subscription.uncanceled':
        await handleSubscriptionUncanceled(event.data);
        break;
      case 'customer.created':
        await handleCustomerCreated(event.data);
        break;
      default:
        console.log('❓ Unhandled event type:', event.type);
    }

    console.log('✅ Webhook processed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('💥 WEBHOOK ERROR:');

    if (error instanceof WebhookVerificationError) {
      console.error('🚫 Signature verification failed:', error.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    console.error('🔥 Internal error:', error);
    console.error('📍 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleCheckoutCreated(data: unknown) {
  console.log('🛒 CHECKOUT CREATED');
  const eventData = data as Record<string, unknown>;
  console.log('- Checkout ID:', eventData.id);
  console.log('- Full data:', JSON.stringify(eventData, null, 2));
}

async function handleCheckoutUpdated(data: unknown) {
  console.log('🛒 CHECKOUT UPDATED');
  const eventData = data as Record<string, unknown>;
  console.log('- Checkout ID:', eventData.id);
  console.log('- Status:', eventData.status);
  console.log('- Full data:', JSON.stringify(eventData, null, 2));
}

async function handleOrderCreated(data: unknown) {
  console.log('📦 ORDER CREATED');
  const eventData = data as Record<string, unknown>;
  console.log('- Order ID:', eventData.id);
  console.log('- Full data:', JSON.stringify(eventData, null, 2));
}

async function handleOrderPaid(data: unknown) {
  console.log('💰 ORDER PAID');
  const eventData = data as Record<string, unknown>;
  console.log('- Order ID:', eventData.id);
  console.log('- Full data:', JSON.stringify(eventData, null, 2));
}

async function handleSubscriptionCreated(data: unknown) {
  console.log('🎉 SUBSCRIPTION CREATED - Starting handler...');
  const eventData = data as Record<string, unknown>;

  console.log('📊 Raw Subscription Data:');
  console.log(JSON.stringify(eventData, null, 2));

  try {
    console.log('🔍 Extracting metadata...');

    // Check different possible locations for metadata
    const metadata = eventData.metadata as Record<string, unknown> | undefined;
    const customerMetadata = (eventData.customer as Record<string, unknown>)?.metadata as
      | Record<string, unknown>
      | undefined;
    const checkoutMetadata = (eventData.checkout as Record<string, unknown>)?.metadata as
      | Record<string, unknown>
      | undefined;

    console.log('📋 Metadata sources:');
    console.log('- Direct metadata:', JSON.stringify(metadata, null, 2));
    console.log('- Customer metadata:', JSON.stringify(customerMetadata, null, 2));
    console.log('- Checkout metadata:', JSON.stringify(checkoutMetadata, null, 2));

    // Try to find userId and tier from any metadata source
    const stackAuthUserId =
      (metadata?.userId as string) ||
      (customerMetadata?.userId as string) ||
      (checkoutMetadata?.userId as string);

    const tier =
      (metadata?.tier as string) ||
      (customerMetadata?.tier as string) ||
      (checkoutMetadata?.tier as string);

    console.log('🎯 Extracted values:');
    console.log('- StackAuth User ID:', stackAuthUserId, '(type:', typeof stackAuthUserId, ')');
    console.log('- Tier:', tier, '(type:', typeof tier, ')');

    if (!stackAuthUserId) {
      console.error('❌ CRITICAL: No stackAuthUserId found in any metadata source');
      console.error('Available keys in eventData:', Object.keys(eventData));
      return;
    }

    if (!tier) {
      console.error('❌ CRITICAL: No tier found in any metadata source');
      console.error('Available keys in eventData:', Object.keys(eventData));
      return;
    }

    // Extract subscription details
    const subscriptionId = eventData.id as string;
    const productId = eventData.productId as string;

    console.log('📝 Subscription details:');
    console.log('- Subscription ID:', subscriptionId);
    console.log('- Product ID:', productId);

    // Handle date fields - they might be in different formats
    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;

    try {
      currentPeriodStart = new Date(
        (eventData.currentPeriodStart as string) ||
          (eventData.startedAt as string) ||
          new Date().toISOString()
      );

      currentPeriodEnd = new Date(
        (eventData.currentPeriodEnd as string) ||
          (eventData.endsAt as string) ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now as fallback
      );

      console.log('📅 Date parsing successful:');
      console.log('- Period start:', currentPeriodStart.toISOString());
      console.log('- Period end:', currentPeriodEnd.toISOString());
    } catch (dateError) {
      console.error('❌ Date parsing error:', dateError);
      throw dateError;
    }

    // Check if subscription already exists (for idempotency)
    console.log('🔍 Checking if subscription already exists...');
    const existingSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.subscriptionId, subscriptionId),
    });

    const subscriptionData = {
      stackAuthUserId: stackAuthUserId,
      subscriptionId: subscriptionId,
      productId: productId,
      status: 'active',
      tier: tier,
      currentPeriodStart,
      currentPeriodEnd,
      updatedAt: new Date(),
    };

    if (existingSubscription) {
      console.log('🔄 Subscription already exists, updating...');
      console.log('📝 Update data:', JSON.stringify(subscriptionData, null, 2));

      await db
        .update(userSubscriptions)
        .set(subscriptionData)
        .where(eq(userSubscriptions.subscriptionId, subscriptionId));

      console.log('✅ SUCCESS: Subscription updated in database');
    } else {
      console.log('💾 Creating new subscription...');
      console.log('📝 Insert data:', JSON.stringify(subscriptionData, null, 2));

      await db.insert(userSubscriptions).values({
        ...subscriptionData,
        createdAt: new Date(),
      });

      console.log('✅ SUCCESS: Subscription created in database');
    }

    console.log(`🎯 User ${stackAuthUserId} -> Tier ${tier} -> Subscription ${subscriptionId}`);
  } catch (error) {
    console.error('💥 ERROR in handleSubscriptionCreated:');
    console.error('- Error type:', error?.constructor?.name);
    console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('- Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Log the exact data that caused the error
    console.error('🔍 Problematic data:', JSON.stringify(eventData, null, 2));
    throw error; // Re-throw to trigger 500 response
  }
}

async function handleSubscriptionUpdated(data: unknown) {
  console.log('🔄 SUBSCRIPTION UPDATED');
  const eventData = data as Record<string, unknown>;
  console.log('- Subscription ID:', eventData.id);
  console.log('- Full data:', JSON.stringify(eventData, null, 2));

  try {
    const metadata = eventData.metadata as Record<string, unknown> | undefined;
    const stackAuthUserId = metadata?.userId as string;

    if (!stackAuthUserId) {
      console.error('❌ Missing stackAuthUserId in subscription metadata');
      return;
    }

    await db
      .update(userSubscriptions)
      .set({
        status: eventData.status as string,
        currentPeriodStart: new Date(
          (eventData.currentPeriodStart as string) || (eventData.startedAt as string)
        ),
        currentPeriodEnd: new Date(
          (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
        ),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.subscriptionId, eventData.id as string));

    console.log(`✅ User ${stackAuthUserId} subscription updated successfully`);
  } catch (error) {
    console.error('💥 Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(data: unknown) {
  console.log('❌ SUBSCRIPTION CANCELED');
  const eventData = data as Record<string, unknown>;
  console.log('- Subscription ID:', eventData.id);
  console.log('- Full data:', JSON.stringify(eventData, null, 2));

  try {
    const metadata = eventData.metadata as Record<string, unknown> | undefined;
    const stackAuthUserId = metadata?.userId as string;

    if (!stackAuthUserId) {
      console.error('❌ Missing stackAuthUserId in subscription metadata');
      return;
    }

    await db
      .update(userSubscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        currentPeriodEnd: new Date(
          (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
        ),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.subscriptionId, eventData.id as string));

    console.log(`✅ User ${stackAuthUserId} subscription canceled successfully`);
  } catch (error) {
    console.error('💥 Error handling subscription canceled:', error);
    throw error;
  }
}

async function handleSubscriptionActive(data: unknown) {
  console.log('🟢 SUBSCRIPTION ACTIVE');
  // This is similar to subscription.created but for when subscription becomes active
  await handleSubscriptionCreated(data);
}

async function handleSubscriptionUncanceled(data: unknown) {
  console.log('🔄 SUBSCRIPTION UNCANCELED');
  const eventData = data as Record<string, unknown>;
  console.log('- Subscription ID:', eventData.id);
  console.log('- Full data:', JSON.stringify(eventData, null, 2));

  try {
    const metadata = eventData.metadata as Record<string, unknown> | undefined;
    const stackAuthUserId = metadata?.userId as string;

    if (!stackAuthUserId) {
      console.error('❌ Missing stackAuthUserId in subscription metadata');
      return;
    }

    await db
      .update(userSubscriptions)
      .set({
        status: 'active',
        canceledAt: null,
        currentPeriodStart: new Date(
          (eventData.currentPeriodStart as string) || (eventData.startedAt as string)
        ),
        currentPeriodEnd: new Date(
          (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
        ),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.subscriptionId, eventData.id as string));

    console.log(`✅ User ${stackAuthUserId} subscription uncanceled successfully`);
  } catch (error) {
    console.error('💥 Error handling subscription uncanceled:', error);
    throw error;
  }
}

async function handleCustomerCreated(data: unknown) {
  console.log('👤 CUSTOMER CREATED');
  const eventData = data as Record<string, unknown>;
  console.log('- Customer ID:', eventData.id);
  console.log('- Full data:', JSON.stringify(eventData, null, 2));
}
