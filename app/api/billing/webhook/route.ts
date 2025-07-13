import { NextRequest, NextResponse } from 'next/server';
import { validateEvent, WebhookVerificationError } from '@polar-sh/sdk/webhooks';
import { db } from '@/lib/db';
import { userSubscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('webhook-signature');
    const timestamp = request.headers.get('webhook-timestamp');
    const webhookId = request.headers.get('webhook-id');

    if (!signature) {
      console.error('❌ MISSING SIGNATURE');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Validate that webhook secret is configured
    if (!process.env.POLAR_WEBHOOK_SECRET) {
      console.error('❌ CRITICAL: POLAR_WEBHOOK_SECRET environment variable is not set');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Validate webhook signature with all required headers
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

    for (let index = 0; index < headerVariants.length; index++) {
      const headers = headerVariants[index];
      // Filter out null/undefined values
      const cleanHeaders = Object.fromEntries(
        Object.entries(headers).filter(([, value]) => value !== null && value !== undefined)
      );

      try {
        event = validateEvent(rawBody, cleanHeaders, process.env.POLAR_WEBHOOK_SECRET!);
        break;
      } catch (error) {
        lastError = error;
        continue;
      }
    }

    if (!event) {
      console.error('💥 All header variants failed. Last error:', lastError);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    switch (event.type) {
      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event.data);
        break;
      case 'subscription.uncanceled':
        await handleSubscriptionUncanceled(event.data);
        break;
      default:
        console.log('❓ Unhandled event type:', event.type);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      console.error('🚫 Signature verification failed:', error.message);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    console.error('🔥 Internal error:', error);
    console.error('📍 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to safely extract string values
function safeExtractString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// Helper function to safely extract object values
function safeExtractObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

// Helper function to safely extract metadata from multiple sources
function extractMetadataValues(eventData: Record<string, unknown>): {
  stackAuthUserId: string | undefined;
  tier: string | undefined;
} {
  const metadata = safeExtractObject(eventData.metadata);
  const customer = safeExtractObject(eventData.customer);
  const checkout = safeExtractObject(eventData.checkout);

  const customerMetadata = customer ? safeExtractObject(customer.metadata) : undefined;
  const checkoutMetadata = checkout ? safeExtractObject(checkout.metadata) : undefined;

  // Try to find userId and tier from any metadata source
  const stackAuthUserId =
    safeExtractString(metadata?.userId) ||
    safeExtractString(customerMetadata?.userId) ||
    safeExtractString(checkoutMetadata?.userId);

  const tier =
    safeExtractString(metadata?.tier) ||
    safeExtractString(customerMetadata?.tier) ||
    safeExtractString(checkoutMetadata?.tier);

  return { stackAuthUserId, tier };
}

async function handleSubscriptionCreated(data: unknown) {
  const eventData = safeExtractObject(data);

  if (!eventData) {
    console.error('❌ CRITICAL: Invalid event data structure');
    return;
  }

  try {
    const { stackAuthUserId, tier } = extractMetadataValues(eventData);

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

    const subscriptionId = safeExtractString(eventData.id);
    const productId = safeExtractString(eventData.productId);

    if (!subscriptionId || !productId) {
      console.error('❌ CRITICAL: Missing required subscription or product ID');
      return;
    }

    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;

    try {
      const startDate =
        safeExtractString(eventData.currentPeriodStart) || safeExtractString(eventData.startedAt);
      const endDate =
        safeExtractString(eventData.currentPeriodEnd) || safeExtractString(eventData.endsAt);

      if (!startDate || !endDate) {
        console.error('❌ CRITICAL: Missing required date fields');
        return;
      }

      currentPeriodStart = new Date(startDate);
      currentPeriodEnd = new Date(endDate);

      // Validate dates
      if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
        console.error('❌ CRITICAL: Invalid date format');
        return;
      }
    } catch (dateError) {
      console.error('❌ Date parsing error:', dateError);
      return;
    }

    const status = safeExtractString(eventData.status);
    if (!status) {
      console.error('❌ CRITICAL: Missing subscription status');
      return;
    }

    const subscriptionData = {
      stackAuthUserId,
      subscriptionId,
      productId,
      status,
      tier,
      currentPeriodStart,
      currentPeriodEnd,
      updatedAt: new Date(),
    };

    const existingSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.subscriptionId, subscriptionId),
    });

    if (existingSubscription) {
      await db
        .update(userSubscriptions)
        .set(subscriptionData)
        .where(eq(userSubscriptions.subscriptionId, subscriptionId));
    } else {
      await db.insert(userSubscriptions).values({
        ...subscriptionData,
        createdAt: new Date(),
      });
    }
  } catch (error) {
    console.error('💥 ERROR in handleSubscriptionCreated:');
    console.error('- Error type:', error?.constructor?.name);
    console.error('- Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('- Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('🔍 Problematic data:', JSON.stringify(eventData, null, 2));
    throw error;
  }
}

async function handleSubscriptionUpdated(data: unknown) {
  const eventData = safeExtractObject(data);

  if (!eventData) {
    console.error('❌ CRITICAL: Invalid event data structure');
    return;
  }

  try {
    const { stackAuthUserId } = extractMetadataValues(eventData);

    if (!stackAuthUserId) {
      console.error('❌ Missing stackAuthUserId in subscription metadata');
      return;
    }

    const subscriptionId = safeExtractString(eventData.id);
    const status = safeExtractString(eventData.status);

    if (!subscriptionId || !status) {
      console.error('❌ CRITICAL: Missing required subscription ID or status');
      return;
    }

    const startDate =
      safeExtractString(eventData.currentPeriodStart) || safeExtractString(eventData.startedAt);
    const endDate =
      safeExtractString(eventData.currentPeriodEnd) || safeExtractString(eventData.endsAt);

    if (!startDate || !endDate) {
      console.error('❌ CRITICAL: Missing required date fields');
      return;
    }

    const currentPeriodStart = new Date(startDate);
    const currentPeriodEnd = new Date(endDate);

    // Validate dates
    if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
      console.error('❌ CRITICAL: Invalid date format');
      return;
    }

    await db
      .update(userSubscriptions)
      .set({
        status,
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.subscriptionId, subscriptionId));
  } catch (error) {
    console.error('💥 Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(data: unknown) {
  const eventData = safeExtractObject(data);

  if (!eventData) {
    console.error('❌ CRITICAL: Invalid event data structure');
    return;
  }

  try {
    const { stackAuthUserId } = extractMetadataValues(eventData);

    if (!stackAuthUserId) {
      console.error('❌ Missing stackAuthUserId in subscription metadata');
      return;
    }

    const subscriptionId = safeExtractString(eventData.id);

    if (!subscriptionId) {
      console.error('❌ CRITICAL: Missing required subscription ID');
      return;
    }

    const endDate =
      safeExtractString(eventData.currentPeriodEnd) || safeExtractString(eventData.endsAt);

    if (!endDate) {
      console.error('❌ CRITICAL: Missing required end date');
      return;
    }

    const currentPeriodEnd = new Date(endDate);

    // Validate date
    if (isNaN(currentPeriodEnd.getTime())) {
      console.error('❌ CRITICAL: Invalid date format');
      return;
    }

    await db
      .update(userSubscriptions)
      .set({
        status: 'canceled',
        canceledAt: new Date(),
        currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.subscriptionId, subscriptionId));
  } catch (error) {
    console.error('💥 Error handling subscription canceled:', error);
    throw error;
  }
}

async function handleSubscriptionUncanceled(data: unknown) {
  const eventData = safeExtractObject(data);

  if (!eventData) {
    console.error('❌ CRITICAL: Invalid event data structure');
    return;
  }

  try {
    const { stackAuthUserId } = extractMetadataValues(eventData);

    if (!stackAuthUserId) {
      console.error('❌ Missing stackAuthUserId in subscription metadata');
      return;
    }

    const subscriptionId = safeExtractString(eventData.id);

    if (!subscriptionId) {
      console.error('❌ CRITICAL: Missing required subscription ID');
      return;
    }

    const startDate =
      safeExtractString(eventData.currentPeriodStart) || safeExtractString(eventData.startedAt);
    const endDate =
      safeExtractString(eventData.currentPeriodEnd) || safeExtractString(eventData.endsAt);

    if (!startDate || !endDate) {
      console.error('❌ CRITICAL: Missing required date fields');
      return;
    }

    const currentPeriodStart = new Date(startDate);
    const currentPeriodEnd = new Date(endDate);

    // Validate dates
    if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
      console.error('❌ CRITICAL: Invalid date format');
      return;
    }

    await db
      .update(userSubscriptions)
      .set({
        status: 'active',
        canceledAt: null,
        currentPeriodStart,
        currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.subscriptionId, subscriptionId));
  } catch (error) {
    console.error('💥 Error handling subscription uncanceled:', error);
    throw error;
  }
}
