# Stripe Migration Plan

## 🚨 Important Rules

Before you begin any work on this migration:

1. **DO NOT START A TASK WITHOUT ASKING FIRST**
   - Always ask which ticket you should work on
   - Wait for explicit approval before beginning implementation
   - Confirm the approach before writing code

2. **ASK FOR CONFIRMATION AFTER COMPLETING A TASK**
   - When you finish a ticket, ask for review
   - Wait for confirmation that the work is correct
   - Ask if any changes are needed before moving to the next ticket

3. **MARK COMPLETED TASKS**
   - Use `[x]` to mark completed tickets
   - Keep `[ ]` for pending tickets
   - Update the checklist immediately after confirmation

---

## Overview

**Goal**: Replace Polar billing with Stripe for subscription management
**Approach**: Big bang migration - remove Polar completely
**Pricing**: Keep same (Pro $20/mo, Business $200/mo)
**Checkout**: Stripe Checkout (hosted)
**Portal**: Stripe Customer Portal (managed)

### Environment Variables

Add these to `.env` and `.env.example`:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here

# Stripe Price IDs (create in Stripe Dashboard first)
STRIPE_PRO_PRICE_ID=price_your_pro_price_id_here      # $20/month
STRIPE_BUSINESS_PRICE_ID=price_your_business_price_id_here # $200/month

# Stripe Webhook Secret (from Stripe CLI or Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Success/Cancel URLs
STRIPE_SUCCESS_URL=http://localhost:3000/billing/success
STRIPE_CANCEL_URL=http://localhost:3000/settings/billing
```

**Remove these Polar variables**:
- `POLAR_ACCESS_TOKEN`
- `POLAR_ENVIRONMENT`
- `POLAR_PRO_PRODUCT_ID`
- `POLAR_BUSINESS_PRODUCT_ID`
- `POLAR_SUCCESS_URL`
- `POLAR_WEBHOOK_SECRET`

---

## Phase 1: Infrastructure Setup

### [x] Task 1.1: Install Stripe SDK and Remove Polar

**Implementation**:
```bash
pnpm remove @polar-sh/sdk
pnpm add stripe
```

**Files to Update**:
- `package.json` - dependencies change

**Tests**: None (dependency change only)

---

### [x] Task 1.2: Create Stripe Client Configuration ✅

**Implementation**:

**Create/Replace**: `lib/billing/client.ts`
```typescript
import Stripe from 'stripe';

/**
 * Centralized Stripe client configuration
 * Single source of truth for all Stripe API interactions
 */

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

/**
 * Re-export Stripe types for convenience
 */
export type { Stripe };
```

**Files to Change**:
- `lib/billing/client.ts` - Replace Polar with Stripe

**Tests**: None (configuration only)

---

### [x] Task 1.3: Update Billing Configuration

**Implementation**:

**Update**: `lib/billing/config.ts`
```typescript
/**
 * Billing configuration and constants
 * Contains price mappings, pricing information, and billing-related constants
 */

// Price ID mapping for Stripe prices
export const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID!,
  business: process.env.STRIPE_BUSINESS_PRICE_ID!,
} as const;

// Pricing information for all tiers (display only - actual prices in Stripe)
export const PRICING = {
  free: {
    price: 0,
    name: 'Free',
    description: 'Perfect for getting started',
    features: ['Basic features', 'Community support', 'Limited usage'],
  },
  pro: {
    price: 20,
    name: 'Pro',
    description: 'For growing teams',
    features: ['All free features', 'Priority support', 'Advanced features', 'Higher usage limits'],
  },
  business: {
    price: 200,
    name: 'Business',
    description: 'For large organizations',
    features: ['All pro features', 'Enterprise support', 'Custom integrations', 'Unlimited usage'],
  },
} as const;

// Billing-related URLs and endpoints
export const BILLING_URLS = {
  success: process.env.STRIPE_SUCCESS_URL || 'http://localhost:3000/billing/success',
  cancel: process.env.STRIPE_CANCEL_URL || 'http://localhost:3000/settings/billing',
} as const;
```

**Files to Change**:
- `lib/billing/config.ts` - Replace `PRODUCT_IDS` with `PRICE_IDS`, update URLs

**Tests**: None (configuration only)

---

### [x] Task 1.4: Update Database Schema

**Implementation**:

**Update**: `lib/db/schema.ts`
```typescript
// Add these fields to the users table (line ~10-20)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  profileImageUrl: text('profile_image_url'),
  stripeCustomerId: text('stripe_customer_id').unique(), // NEW: Stripe customer ID
  notificationSettings: text('notification_settings'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Update userSubscriptions table (line ~76-93)
export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(),
  organizationId: uuid('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }),
  subscriptionType: text('subscription_type').notNull().default('personal'),
  stripeSubscriptionId: text('stripe_subscription_id').unique(), // CHANGED: from subscriptionId
  stripeCustomerId: text('stripe_customer_id').notNull(), // NEW: Stripe customer ID
  stripePriceId: text('stripe_price_id'), // CHANGED: from productId
  status: text('status').notNull(),
  tier: text('tier').notNull(),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: text('cancel_at_period_end').notNull().default('false'), // NEW: Stripe pattern
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Files to Change**:
- `lib/db/schema.ts` - Add `stripeCustomerId` to users, update userSubscriptions fields

**Generate Migration**:
```bash
pnpm run db:generate
pnpm run db:migrate
```

**Tests**: None (schema change only, but run migration in dev)

---

## Phase 2: Core Billing Operations

### [x] Task 2.1: Create Stripe Checkout Session

**Implementation**:

**Update**: `lib/billing/operations.ts`
```typescript
import { stripe } from './client';
import { PRICE_IDS, BILLING_URLS } from './config';
import { type CheckoutSessionParams, type OperationResult } from '@/lib/types';
import { SubscriptionStatus } from '@/lib/db/schema';
import { getUserSubscription, updateUserSubscription } from './subscription';
import { getSubscriptionEligibility } from './eligibility';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Get or create Stripe customer for a user
 */
async function getOrCreateStripeCustomer(
  clerkUserId: string,
  customerEmail: string
): Promise<string> {
  // Check if user already has a Stripe customer ID
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: customerEmail,
    metadata: {
      clerkUserId,
    },
  });

  // Save customer ID to user record
  await db
    .update(users)
    .set({ stripeCustomerId: customer.id, updatedAt: new Date() })
    .where(eq(users.clerkUserId, clerkUserId));

  return customer.id;
}

/**
 * Create a Stripe Checkout session for a specific tier
 */
export async function createCheckoutSession(
  params: CheckoutSessionParams
): Promise<OperationResult<{ url: string; id: string }>> {
  try {
    const { tier, userId, customerEmail, successUrl, metadata = {} } = params;

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return {
        success: false,
        message: `Invalid tier: ${tier}`,
      };
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, customerEmail);

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || BILLING_URLS.success,
      cancel_url: BILLING_URLS.cancel,
      metadata: {
        clerkUserId: userId,
        tier,
        ...metadata,
      },
      subscription_data: {
        metadata: {
          clerkUserId: userId,
          tier,
        },
      },
    });

    return {
      success: true,
      message: 'Checkout session created successfully',
      data: {
        url: session.url!,
        id: session.id,
      },
    };
  } catch (error) {
    console.error('💥 Error creating checkout session:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

/**
 * Cancel user's active subscription (mark for cancellation at period end)
 */
export async function cancelUserSubscription(
  clerkUserId: string,
  stripeSubscriptionId: string
): Promise<OperationResult> {
  try {
    console.log('🔄 Canceling subscription via Stripe API:', stripeSubscriptionId);

    const currentSubscription = await getUserSubscription(clerkUserId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    if (!eligibility.canCancel) {
      return {
        success: false,
        message: 'Subscription cannot be canceled at this time.',
      };
    }

    if (
      !currentSubscription.activeSubscription ||
      currentSubscription.activeSubscription.stripeSubscriptionId !== stripeSubscriptionId
    ) {
      return {
        success: false,
        message: 'Subscription not found or does not belong to this user.',
      };
    }

    // Cancel subscription at period end via Stripe API
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    console.log('✅ Successfully canceled subscription in Stripe');

    // Update local database
    await db
      .update(userSubscriptions)
      .set({
        cancelAtPeriodEnd: 'true',
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    console.log('✅ Successfully updated local subscription status');

    return {
      success: true,
      message:
        'Subscription has been successfully canceled. You will continue to have access until the end of your current billing period.',
    };
  } catch (error) {
    console.error('💥 Error in cancelUserSubscription:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to cancel subscription at this time. Please contact support.',
    };
  }
}

/**
 * Reactivate a canceled subscription (remove cancellation)
 */
export async function reactivateUserSubscription(
  clerkUserId: string,
  stripeSubscriptionId: string
): Promise<OperationResult> {
  try {
    console.log('🔄 Reactivating subscription via Stripe API:', stripeSubscriptionId);

    const currentSubscription = await getUserSubscription(clerkUserId);
    const eligibility = getSubscriptionEligibility(currentSubscription);

    if (!eligibility.canReactivate) {
      return {
        success: false,
        message: 'Subscription cannot be reactivated at this time.',
      };
    }

    if (
      !currentSubscription.activeSubscription ||
      currentSubscription.activeSubscription.stripeSubscriptionId !== stripeSubscriptionId
    ) {
      return {
        success: false,
        message: 'Subscription not found or does not belong to this user.',
      };
    }

    // Reactivate subscription via Stripe API
    await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    console.log('✅ Successfully reactivated subscription in Stripe');

    // Update local database
    await db
      .update(userSubscriptions)
      .set({
        status: SubscriptionStatus.ACTIVE,
        cancelAtPeriodEnd: 'false',
        canceledAt: null,
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId));

    console.log('✅ Successfully updated local subscription status to active');

    return {
      success: true,
      message: 'Subscription has been successfully reactivated.',
    };
  } catch (error) {
    console.error('💥 Error in reactivateUserSubscription:', error);
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Unable to reactivate subscription at this time. Please contact support.',
    };
  }
}

/**
 * Create Stripe Customer Portal session for subscription management
 */
export async function createCustomerPortalSession(
  clerkUserId: string
): Promise<OperationResult<{ url: string }>> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.clerkUserId, clerkUserId),
    });

    if (!user?.stripeCustomerId) {
      return {
        success: false,
        message: 'No Stripe customer found for this user.',
      };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: BILLING_URLS.cancel,
    });

    return {
      success: true,
      message: 'Customer portal session created',
      data: {
        url: session.url,
      },
    };
  } catch (error) {
    console.error('💥 Error creating customer portal session:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create portal session',
    };
  }
}
```

**Files to Change**:
- `lib/billing/operations.ts` - Complete rewrite for Stripe
- Import `userSubscriptions` from schema

**Tests to Update**:
- Create: `__tests__/lib/billing/operations.test.ts`
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCheckoutSession, cancelUserSubscription } from '@/lib/billing/operations';
import { stripe } from '@/lib/billing/client';

vi.mock('@/lib/billing/client', () => ({
  stripe: {
    customers: {
      create: vi.fn(),
    },
    checkout: {
      sessions: {
        create: vi.fn(),
      },
    },
    subscriptions: {
      update: vi.fn(),
    },
  },
}));

describe('Billing Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create checkout session with correct params', async () => {
    vi.mocked(stripe.checkout.sessions.create).mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/test',
    } as any);

    const result = await createCheckoutSession({
      tier: 'pro',
      userId: 'user_123',
      customerEmail: 'test@example.com',
    });

    expect(result.success).toBe(true);
    expect(result.data?.url).toContain('stripe.com');
  });

  it('should cancel subscription at period end', async () => {
    vi.mocked(stripe.subscriptions.update).mockResolvedValue({
      id: 'sub_123',
      cancel_at_period_end: true,
    } as any);

    // Test will need mock database setup
  });
});
```

---

### [x] Task 2.2: Update Subscription CRUD Operations

**Implementation**:

**Update**: `lib/billing/subscription.ts`
```typescript
// Update all references:
// - subscriptionId → stripeSubscriptionId
// - productId → stripePriceId
// Add: stripeCustomerId handling

// Line ~83: Update getUserSubscription
export async function getUserSubscription(clerkUserId: string): Promise<UserSubscriptionInfo> {
  const activeSubscription = await db.query.userSubscriptions.findFirst({
    where: eq(userSubscriptions.clerkUserId, clerkUserId),
    orderBy: [desc(userSubscriptions.createdAt)],
  });

  if (!activeSubscription) {
    console.log('🆕 Creating free tier subscription for user:', clerkUserId);
    const freeSubscription = await createFreeSubscription(clerkUserId);

    return {
      tier: SubscriptionTier.FREE,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: null,
      activeSubscription: freeSubscription,
    };
  }

  const subscriptionTier = safeSubscriptionTierCast(activeSubscription.tier);
  const subscriptionStatus = safeSubscriptionStatusCast(activeSubscription.status);

  let currentTier = SubscriptionTier.FREE;

  // Check if subscription is marked for cancellation
  const isCancelAtPeriodEnd = activeSubscription.cancelAtPeriodEnd === 'true';
  
  // User has access to paid tier if:
  // 1. Subscription is active and not marked for cancellation
  // 2. Subscription is canceled but still in grace period
  const isInGracePeriod =
    isCancelAtPeriodEnd &&
    activeSubscription.currentPeriodEnd &&
    new Date() < activeSubscription.currentPeriodEnd;

  if (
    (subscriptionStatus === SubscriptionStatus.ACTIVE && !isCancelAtPeriodEnd) ||
    isInGracePeriod
  ) {
    currentTier = subscriptionTier;
  }

  return {
    tier: currentTier,
    status: subscriptionStatus,
    currentPeriodEnd: activeSubscription.currentPeriodEnd,
    activeSubscription,
  };
}

// Line ~131: Update updateUserSubscription
export async function updateUserSubscription(
  clerkUserId: string,
  stripeSubscriptionId: string,
  updates: SubscriptionUpdateParams
): Promise<void> {
  await db
    .update(userSubscriptions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(userSubscriptions.clerkUserId, clerkUserId),
        eq(userSubscriptions.stripeSubscriptionId, stripeSubscriptionId)
      )
    );
}

// Line ~58: Update createFreeSubscription (add stripeCustomerId)
export async function createFreeSubscription(clerkUserId: string): Promise<UserSubscription> {
  // Get stripe customer ID if exists
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  });

  const freeSubscriptionData = {
    clerkUserId,
    stripeSubscriptionId: null,
    stripeCustomerId: user?.stripeCustomerId || '',
    stripePriceId: null,
    status: SubscriptionStatus.ACTIVE,
    tier: SubscriptionTier.FREE,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: 'false',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const [newSubscription] = await db
    .insert(userSubscriptions)
    .values(freeSubscriptionData)
    .returning();

  return newSubscription;
}
```

**Files to Change**:
- `lib/billing/subscription.ts` - Update field names, add `cancelAtPeriodEnd` logic

**Tests to Update**:
- `__tests__/lib/billing/subscription.test.ts` - Update field names in mocks

---

### [x] Task 2.3: Update Billing Index Exports

**Implementation**:

**Update**: `lib/billing/index.ts`
```typescript
// Line 34: Update export
export { PRICE_IDS, PRICING, BILLING_URLS } from './config';

// Line 37: Update client export
export { stripe } from './client';

// Add new export:
export { createCustomerPortalSession } from './operations';
```

**Files to Change**:
- `lib/billing/index.ts` - Update `PRODUCT_IDS` → `PRICE_IDS`, add portal export

**Tests**: None

---

## Phase 3: Stripe Webhooks

### [x] Task 3.1: Replace Polar Webhook with Stripe Webhook Handler

**Implementation**:

**Replace**: `app/api/billing/webhook/route.ts` (keep same URL structure)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/billing/client';
import { db } from '@/lib/db';
import { userSubscriptions, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Stripe from 'stripe';

/**
 * Stripe Webhook Handler
 * Processes subscription lifecycle events from Stripe
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
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
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
      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('💥 Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
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

    await db.insert(userSubscriptions).values({
      clerkUserId,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: subscription.customer as string,
      stripePriceId: priceId,
      status: subscription.status,
      tier,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
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

    await db
      .update(userSubscriptions)
      .set({
        status: subscription.status,
        stripePriceId: priceId,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
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
    if (!invoice.subscription) return;

    const subscriptionId = invoice.subscription as string;

    // Ensure subscription is active after successful payment
    await db
      .update(userSubscriptions)
      .set({
        status: 'active',
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
    if (!invoice.subscription) return;

    const subscriptionId = invoice.subscription as string;

    // Mark subscription as past_due
    await db
      .update(userSubscriptions)
      .set({
        status: 'past_due',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, subscriptionId));

    console.log('⚠️ Payment failed for subscription:', subscriptionId);
    // TODO: Send email notification to user
  } catch (error) {
    console.error('💥 Error handling invoice.payment_failed:', error);
    throw error;
  }
}
```

**Files to Replace**:
- `app/api/billing/webhook/route.ts` - Replace Polar webhook with Stripe webhook handler

**Tests to Create**:
- `__tests__/api/billing/webhook-stripe.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/billing/webhook-stripe/route';
import { stripe } from '@/lib/billing/client';

vi.mock('@/lib/billing/client');

describe('Stripe Webhook', () => {
  it('should reject requests without signature', async () => {
    const request = new Request('http://localhost/api/billing/webhook-stripe', {
      method: 'POST',
      body: '{}',
    });

    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it('should handle subscription.created event', async () => {
    // Mock webhook construction
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          metadata: { clerkUserId: 'user_123', tier: 'pro' },
          items: { data: [{ price: { id: 'price_123' } }] },
          current_period_start: 1234567890,
          current_period_end: 1234567890,
          cancel_at_period_end: false,
        },
      },
    } as any);

    // Test webhook processing
  });
});
```

---

## Phase 4: API Routes Migration

### [x] Task 4.1: Update Create Checkout Route

**Implementation**:

**Update**: `app/api/billing/create-checkout/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createCheckoutSession } from '@/lib/billing';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { tier } = body;

    if (!tier || !['pro', 'business'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Get user email from Clerk
    const { clerkClient } = await import('@clerk/nextjs/server');
    const user = await clerkClient.users.getUser(userId);
    const customerEmail = user.emailAddresses[0]?.emailAddress;

    if (!customerEmail) {
      return NextResponse.json({ error: 'No email found for user' }, { status: 400 });
    }

    const result = await createCheckoutSession({
      tier,
      userId,
      customerEmail,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: result.data?.url,
      sessionId: result.data?.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

**Files to Change**:
- `app/api/billing/create-checkout/route.ts` - Update to use Stripe

**Tests**: Update API route tests

---

### [x] Task 4.2: Update Cancel Subscription Route

**Implementation**:

**Update**: `app/api/billing/cancel-subscription/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { cancelUserSubscription, getUserSubscription } from '@/lib/billing';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscription(userId);

    if (!subscription.activeSubscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    const result = await cancelUserSubscription(
      userId,
      subscription.activeSubscription.stripeSubscriptionId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}
```

**Files to Change**:
- `app/api/billing/cancel-subscription/route.ts` - Update field: `subscriptionId` → `stripeSubscriptionId`

**Tests**: Update API route tests

---

### [x] Task 4.3: Update Reactivate Subscription Route

**Implementation**:

**Update**: `app/api/billing/reactivate-subscription/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { reactivateUserSubscription, getUserSubscription } from '@/lib/billing';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await getUserSubscription(userId);

    if (!subscription.activeSubscription?.stripeSubscriptionId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
    }

    const result = await reactivateUserSubscription(
      userId,
      subscription.activeSubscription.stripeSubscriptionId
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate subscription' },
      { status: 500 }
    );
  }
}
```

**Files to Change**:
- `app/api/billing/reactivate-subscription/route.ts` - Update field name

**Tests**: Update API route tests

---

### [x] Task 4.4: Add Customer Portal Route

**Implementation**:

**Create**: `app/api/billing/customer-portal/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { createCustomerPortalSession } from '@/lib/billing';

/**
 * Create Stripe Customer Portal session
 * Allows users to manage their subscription, payment methods, and billing history
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await createCustomerPortalSession(userId);

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      url: result.data?.url,
    });
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    );
  }
}
```

**Files to Create**:
- `app/api/billing/customer-portal/route.ts` - New route for Stripe portal

**Tests**: Create new test file

---

### [x] Task 4.5: Update/Remove Polar-Specific Routes

**Implementation**:

**Files to Update/Remove**:
- `app/api/billing/upgrade-subscription/route.ts` - Remove (use create-checkout for all tiers)
- `app/api/billing/sync/route.ts` - Update to use Stripe sync (Task 5.2)

**Actions**:
1. Delete `upgrade-subscription/route.ts`
2. Keep `sync/route.ts` for Stripe sync (update in Phase 5)

---

## Phase 5: Stripe Sync & Cron

### [x] Task 5.1: Create Stripe Sync Utilities

**Implementation**:

**Create/Replace**: `lib/billing/stripe-sync.ts`
```typescript
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
export async function syncUserSubscriptionFromStripe(clerkUserId: string): Promise<{
  success: boolean;
  message: string;
  subscription?: Stripe.Subscription;
}> {
  try {
    console.log('🔄 Syncing subscription from Stripe for user:', clerkUserId);

    const localSubscription = await db.query.userSubscriptions.findFirst({
      where: eq(userSubscriptions.clerkUserId, clerkUserId),
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
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        // Subscription deleted in Stripe
        await db
          .update(userSubscriptions)
          .set({
            status: 'canceled',
            canceledAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(userSubscriptions.stripeSubscriptionId, localSubscription.stripeSubscriptionId));

        return {
          success: true,
          message: 'Subscription no longer exists in Stripe - marked as canceled',
        };
      }
      throw error;
    }

    // Update local database
    const priceId = stripeSubscription.items.data[0]?.price.id;

    await db
      .update(userSubscriptions)
      .set({
        status: stripeSubscription.status,
        stripePriceId: priceId,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ? 'true' : 'false',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.stripeSubscriptionId, localSubscription.stripeSubscriptionId));

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
        const result = await syncUserSubscriptionFromStripe(subscription.clerkUserId);
        if (result.success) {
          syncedCount++;
        } else {
          errors.push(`${subscription.clerkUserId}: ${result.message}`);
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        errors.push(
          `${subscription.clerkUserId}: ${error instanceof Error ? error.message : 'Unknown'}`
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
```

**Files to Create**:
- `lib/billing/stripe-sync.ts` - Replaces `polar-sync.ts`

**Files to Delete**:
- `lib/billing/polar-sync.ts` - Remove Polar sync

**Tests to Create**:
- `__tests__/lib/billing/stripe-sync.test.ts`

---

### [x] Task 5.2: Update Cron Sync Job

**Implementation**:

**Update**: `lib/billing/cron-sync.ts`
```typescript
import { syncStaleSubscriptions } from './stripe-sync';

/**
 * Cron job for syncing Stripe subscriptions
 * Run every 6 hours to catch any missed webhooks
 */
export async function runSubscriptionSync() {
  console.log('🕐 Starting scheduled Stripe subscription sync...');

  try {
    const result = await syncStaleSubscriptions(6); // Sync subscriptions older than 6 hours

    console.log(`✅ Sync complete: ${result.syncedCount} synced`);

    if (result.errors.length > 0) {
      console.error(`⚠️ Sync errors (${result.errors.length}):`, result.errors.slice(0, 5));
    }

    return {
      success: true,
      syncedCount: result.syncedCount,
      errorCount: result.errors.length,
    };
  } catch (error) {
    console.error('💥 Cron sync failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

**Files to Change**:
- `lib/billing/cron-sync.ts` - Import from `stripe-sync` instead of `polar-sync`

**Update**: `app/api/cron/subscription-sync/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { runSubscriptionSync } from '@/lib/billing/cron-sync';

/**
 * Cron endpoint for subscription sync
 * Protected by CRON_SECRET in production
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret in production
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runSubscriptionSync();

    return NextResponse.json(result);
  } catch (error) {
    console.error('💥 Cron endpoint error:', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
```

**Files to Change**:
- `app/api/cron/subscription-sync/route.ts` - No changes needed (just verify it works)

**Tests**: Update cron tests

---

## Phase 6: Frontend Updates

### [x] Task 6.1: Update Billing Page UI Text

**Implementation**:

**Update**: `app/(logged-in)/settings/billing/page.tsx`
```typescript
// Line ~542-546: Update billing information card
<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    Billing is managed through Stripe. You can update your payment methods and view
    detailed billing history in your Stripe Customer Portal.
  </AlertDescription>
</Alert>

// Add Customer Portal button after the alert:
<Button
  onClick={async () => {
    const response = await fetch('/api/billing/customer-portal', {
      method: 'POST',
    });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  }}
  variant="outline"
  className="mt-4"
>
  <CreditCard className="h-4 w-4 mr-2" />
  Manage Billing in Stripe
</Button>
```

**Files to Change**:
- `app/(logged-in)/settings/billing/page.tsx` - Change "Polar" → "Stripe", add portal button

**Tests**: Visual testing only

---

### [x] Task 6.2: Update Success Page

**Implementation**:

**Update**: `app/(logged-in)/billing/success/page.tsx`
```typescript
// Verify this page works with Stripe checkout
// No major changes needed - webhook handles subscription creation
// May want to update UI text from "Polar" → "Stripe" if mentioned
```

**Files to Review**:
- `app/(logged-in)/billing/success/page.tsx` - Check for Polar references

**Tests**: Manual testing after checkout

---

## Phase 7: Cleanup & Testing

### [x] Task 7.1: Remove Polar Dependencies

**Implementation**:

```bash
pnpm remove @polar-sh/sdk
```

**Files to Delete**:
- `lib/billing/polar-sync.ts`
- `app/api/billing/webhook/route.ts` (old Polar webhook)
- `app/api/billing/upgrade-subscription/` (if not reused)

**Files to Update**:
- `.env.example` - Remove Polar vars, add Stripe vars
- `README.md` - Update billing setup instructions

**Environment Variables to Remove**:
```bash
# Remove from .env and .env.example
POLAR_ACCESS_TOKEN
POLAR_ENVIRONMENT
POLAR_PRO_PRODUCT_ID
POLAR_BUSINESS_PRODUCT_ID
POLAR_SUCCESS_URL
POLAR_WEBHOOK_SECRET
```

---

### [x] Task 7.2: Update Environment Example ✅

**Implementation**:

**Update**: `.env.example`
```bash
# Remove all POLAR_* variables
# Add Stripe section:

# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3000/billing/success
STRIPE_CANCEL_URL=http://localhost:3000/settings/billing
```

**Files Changed**:
- ✅ `.env.example` - Complete Stripe migration
- ✅ `vitest.config.ts` - Updated mock imports
- ✅ `emails/welcome.tsx` - Polar → Stripe references
- ✅ `app/api/billing/sync/route.ts` - Updated imports and functions
- ✅ `app/(logged-out)/home/data/technologies.ts` - Technology entry updated
- ✅ `public/logos/stripe_light.svg` - Created official logo
- ✅ `public/logos/stripe_dark.svg` - Created official logo
- ✅ `__tests__/setup/mocks.ts` - Mock objects renamed (Polar → Stripe)
- ✅ `components/home.tsx` - "Polar integration" → "Stripe integration"
- ✅ `.cursor/rules/general.mdc` - All Polar references updated to Stripe

**Testing Webhooks Locally**:
```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Start dev server
pnpm run dev

# In another terminal, forward webhooks
stripe listen --forward-to localhost:3000/api/billing/webhook
# Copy the whsec_... secret to .env as STRIPE_WEBHOOK_SECRET

# Test events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
```

---

### [ ] Task 7.3: Run All Tests

**Implementation**:

```bash
# Run full test suite
pnpm test

# Run type checking
pnpm run typecheck

# Run linting
pnpm run lint
```

**Fix**:
- Any broken imports referencing Polar
- Any type errors from field name changes
- Any test failures

**Files to Check**:
- All test files in `__tests__/`
- Especially billing-related tests

---

