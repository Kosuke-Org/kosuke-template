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

async function handleSubscriptionCreated(data: unknown) {
  const eventData = data as Record<string, unknown>;

  try {
    // Check different possible locations for metadata
    const metadata = eventData.metadata as Record<string, unknown> | undefined;
    const customerMetadata = (eventData.customer as Record<string, unknown>)?.metadata as
      | Record<string, unknown>
      | undefined;
    const checkoutMetadata = (eventData.checkout as Record<string, unknown>)?.metadata as
      | Record<string, unknown>
      | undefined;

    // Try to find userId and tier from any metadata source
    const stackAuthUserId =
      (metadata?.userId as string) ||
      (customerMetadata?.userId as string) ||
      (checkoutMetadata?.userId as string);

    const tier =
      (metadata?.tier as string) ||
      (customerMetadata?.tier as string) ||
      (checkoutMetadata?.tier as string);

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

    const subscriptionId = eventData.id as string;
    const productId = eventData.productId as string;

    let currentPeriodStart: Date;
    let currentPeriodEnd: Date;

    try {
      currentPeriodStart = new Date(
        (eventData.currentPeriodStart as string) || (eventData.startedAt as string)
      );
      currentPeriodEnd = new Date(
        (eventData.currentPeriodEnd as string) || (eventData.endsAt as string)
      );
    } catch (dateError) {
      console.error('❌ Date parsing error:', dateError);
      return;
    }

    const subscriptionData = {
      stackAuthUserId,
      subscriptionId,
      productId,
      status: eventData.status as string,
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
  const eventData = data as Record<string, unknown>;

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
  } catch (error) {
    console.error('💥 Error handling subscription updated:', error);
    throw error;
  }
}

async function handleSubscriptionCanceled(data: unknown) {
  const eventData = data as Record<string, unknown>;

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
  } catch (error) {
    console.error('💥 Error handling subscription canceled:', error);
    throw error;
  }
}

async function handleSubscriptionUncanceled(data: unknown) {
  const eventData = data as Record<string, unknown>;

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
  } catch (error) {
    console.error('💥 Error handling subscription uncanceled:', error);
    throw error;
  }
}
