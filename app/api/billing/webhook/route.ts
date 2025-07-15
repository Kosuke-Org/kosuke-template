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
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Validate that webhook secret is configured
    if (!process.env.POLAR_WEBHOOK_SECRET) {
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

    for (let index = 0; index < headerVariants.length; index++) {
      const headers = headerVariants[index];
      // Filter out null/undefined values
      const cleanHeaders = Object.fromEntries(
        Object.entries(headers).filter(([, value]) => value !== null && value !== undefined)
      );

      try {
        event = validateEvent(rawBody, cleanHeaders, process.env.POLAR_WEBHOOK_SECRET!);
        break;
      } catch {
        continue;
      }
    }

    if (!event) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    switch (event.type) {
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
      case 'checkout.created':
      case 'checkout.updated':
      case 'customer.created':
        // These events are informational and don't require action
        break;
      default:
      // Unhandled event type
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

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
  clerkUserId: string | undefined;
  tier: string | undefined;
} {
  const metadata = safeExtractObject(eventData.metadata);
  const customer = safeExtractObject(eventData.customer);
  const checkout = safeExtractObject(eventData.checkout);

  const customerMetadata = customer ? safeExtractObject(customer.metadata) : undefined;
  const checkoutMetadata = checkout ? safeExtractObject(checkout.metadata) : undefined;

  // Try to find userId and tier from any metadata source
  const clerkUserId =
    safeExtractString(metadata?.userId) ||
    safeExtractString(customerMetadata?.userId) ||
    safeExtractString(checkoutMetadata?.userId);

  const tier =
    safeExtractString(metadata?.tier) ||
    safeExtractString(customerMetadata?.tier) ||
    safeExtractString(checkoutMetadata?.tier);

  return { clerkUserId, tier };
}

async function handleSubscriptionCreated(data: unknown) {
  const eventData = safeExtractObject(data);

  if (!eventData) {
    return;
  }

  try {
    const { clerkUserId, tier } = extractMetadataValues(eventData);

    if (!clerkUserId) {
      return;
    }

    if (!tier) {
      return;
    }

    const subscriptionId = safeExtractString(eventData.id);
    const productId = safeExtractString(eventData.productId);

    if (!subscriptionId || !productId) {
      return;
    }

    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;

    try {
      // Improved date field extraction for Polar's actual structure
      const startDate =
        safeExtractString(eventData.currentPeriodStart) ||
        safeExtractString(eventData.startedAt) ||
        safeExtractString(eventData.started_at) ||
        safeExtractString(eventData.current_period_start);

      const endDate =
        safeExtractString(eventData.currentPeriodEnd) ||
        safeExtractString(eventData.endsAt) ||
        safeExtractString(eventData.ends_at) ||
        safeExtractString(eventData.current_period_end);

      if (!startDate || !endDate) {
        return;
      }

      currentPeriodStart = new Date(startDate);
      currentPeriodEnd = new Date(endDate);

      // Validate dates
      if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
        return;
      }
    } catch {
      return;
    }

    const status = safeExtractString(eventData.status);
    if (!status) {
      return;
    }

    const subscriptionData = {
      clerkUserId,
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
    throw error;
  }
}

async function handleSubscriptionUpdated(data: unknown) {
  const eventData = safeExtractObject(data);

  if (!eventData) {
    return;
  }

  try {
    const { clerkUserId } = extractMetadataValues(eventData);

    if (!clerkUserId) {
      return;
    }

    const subscriptionId = safeExtractString(eventData.id);
    const status = safeExtractString(eventData.status);

    if (!subscriptionId || !status) {
      return;
    }

    // Improved date field extraction for Polar's actual structure
    const startDate =
      safeExtractString(eventData.currentPeriodStart) ||
      safeExtractString(eventData.startedAt) ||
      safeExtractString(eventData.started_at) ||
      safeExtractString(eventData.current_period_start);

    const endDate =
      safeExtractString(eventData.currentPeriodEnd) ||
      safeExtractString(eventData.endsAt) ||
      safeExtractString(eventData.ends_at) ||
      safeExtractString(eventData.current_period_end);

    if (!startDate || !endDate) {
      return;
    }

    const currentPeriodStart = new Date(startDate);
    const currentPeriodEnd = new Date(endDate);

    // Validate dates
    if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
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
    throw error;
  }
}

async function handleSubscriptionActive(data: unknown) {
  const eventData = safeExtractObject(data);

  if (!eventData) {
    return;
  }

  try {
    const { clerkUserId, tier } = extractMetadataValues(eventData);

    if (!clerkUserId) {
      return;
    }

    const subscriptionId = safeExtractString(eventData.id);
    const productId =
      safeExtractString(eventData.productId) || safeExtractString(eventData.product_id);

    if (!subscriptionId) {
      return;
    }

    // Improved date field extraction for Polar's actual structure
    const startDate =
      safeExtractString(eventData.currentPeriodStart) ||
      safeExtractString(eventData.startedAt) ||
      safeExtractString(eventData.started_at) ||
      safeExtractString(eventData.current_period_start);

    const endDate =
      safeExtractString(eventData.currentPeriodEnd) ||
      safeExtractString(eventData.endsAt) ||
      safeExtractString(eventData.ends_at) ||
      safeExtractString(eventData.current_period_end);

    let currentPeriodStart: Date | null = null;
    let currentPeriodEnd: Date | null = null;

    if (startDate && endDate) {
      currentPeriodStart = new Date(startDate);
      currentPeriodEnd = new Date(endDate);

      // Validate dates
      if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
        currentPeriodStart = null;
        currentPeriodEnd = null;
      }
    }

    const updateData: {
      status: string;
      canceledAt: Date | null;
      updatedAt: Date;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      tier?: string;
      productId?: string;
    } = {
      status: 'active',
      canceledAt: null,
      updatedAt: new Date(),
    };

    if (currentPeriodStart && currentPeriodEnd) {
      updateData.currentPeriodStart = currentPeriodStart;
      updateData.currentPeriodEnd = currentPeriodEnd;
    }

    if (tier) {
      updateData.tier = tier;
    }

    if (productId) {
      updateData.productId = productId;
    }

    const existing = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.subscriptionId, subscriptionId),
    });

    if (existing) {
      await db
        .update(userSubscriptions)
        .set(updateData)
        .where(eq(userSubscriptions.subscriptionId, subscriptionId));
    } else {
      // Create new subscription if it doesn't exist
      if (!tier || !productId) {
        return;
      }

      await db.insert(userSubscriptions).values({
        clerkUserId,
        subscriptionId,
        productId,
        status: 'active',
        tier,
        currentPeriodStart,
        currentPeriodEnd,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    throw error;
  }
}

async function handleSubscriptionCanceled(data: unknown) {
  const eventData = safeExtractObject(data);

  if (!eventData) {
    return;
  }

  try {
    const { clerkUserId } = extractMetadataValues(eventData);

    if (!clerkUserId) {
      return;
    }

    const subscriptionId = safeExtractString(eventData.id);

    if (!subscriptionId) {
      return;
    }

    const endDate =
      safeExtractString(eventData.currentPeriodEnd) || safeExtractString(eventData.endsAt);

    if (!endDate) {
      return;
    }

    const currentPeriodEnd = new Date(endDate);

    // Validate date
    if (isNaN(currentPeriodEnd.getTime())) {
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
    throw error;
  }
}

async function handleSubscriptionUncanceled(data: unknown) {
  const eventData = safeExtractObject(data);

  if (!eventData) {
    return;
  }

  try {
    const { clerkUserId } = extractMetadataValues(eventData);

    if (!clerkUserId) {
      return;
    }

    const subscriptionId = safeExtractString(eventData.id);

    if (!subscriptionId) {
      return;
    }

    const startDate =
      safeExtractString(eventData.currentPeriodStart) || safeExtractString(eventData.startedAt);
    const endDate =
      safeExtractString(eventData.currentPeriodEnd) || safeExtractString(eventData.endsAt);

    if (!startDate || !endDate) {
      return;
    }

    const currentPeriodStart = new Date(startDate);
    const currentPeriodEnd = new Date(endDate);

    // Validate dates
    if (isNaN(currentPeriodStart.getTime()) || isNaN(currentPeriodEnd.getTime())) {
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
    throw error;
  }
}
