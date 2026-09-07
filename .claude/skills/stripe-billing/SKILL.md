---
name: stripe-billing
description: Stripe billing reference - products.json lookup keys and tierLevel hierarchy, stripe:seed sync, subscription operations (checkout, cancel, reactivate, portal, scheduled downgrades), eligibility states and grace periods, webhook events, free-tier org lifecycle, adding a pricing tier, and local webhook testing with the Stripe CLI. Load for any billing, subscription, pricing, or checkout work.
---

# Stripe Billing

The template uses a **dynamic Stripe integration** where products and pricing are managed via JSON configuration and synced to Stripe using lookup keys.

#### How It Works

1. **Products Configuration**: All tiers (free, pro, business) are defined in `lib/billing/products.json`
2. **Stripe Sync**: Run `bun run stripe:seed` to create/update products in Stripe
3. **Lookup Keys**: Products are fetched dynamically using lookup keys (e.g., `free_monthly`, `pro_monthly`)
4. **Dynamic Pricing**: The billing page fetches pricing directly from Stripe via tRPC
5. **No Manual Price IDs**: Unlike traditional Stripe setups, you don't need to manually copy price IDs to environment variables

#### Key Architecture Decisions

- **Single Source of Truth**: Products defined once in `lib/billing/products.json`
- **Easy Updates**: Change pricing by editing JSON and re-running sync script
- **Migration-Friendly**: All users (including free tier) have Stripe subscriptions
- **No Hardcoded Values**: Pricing fetched dynamically from Stripe using lookup keys
- **Idempotent Sync**: Safe to run `bun run stripe:seed` multiple times without duplicates
- **Explicit Types**: Use clear, explicit type definitions rather than dynamic enum generation for better LLM understanding and code clarity
- **Tier Hierarchy via Explicit Levels**: Each product has a `tierLevel` field (0, 1, 2, etc.) that explicitly defines its access level. The `hasFeatureAccess()` function compares these levels to determine access. Falls back to array index if `tierLevel` is missing.

#### Subscription Management

- **Subscriptions**: Synced via webhooks to `orgSubscriptions` table
- **Checkout**: Use Stripe Checkout for subscription management
- **Tiers**: Lookup keys (e.g., 'free_monthly', 'pro_monthly', 'business_monthly') stored in database
- **Webhooks**: Handle subscription changes via `/api/billing/webhook`
- **Cron Sync**: Automated subscription sync every 6 hours
- **Customer Portal**: Stripe manages payment methods and billing history

```typescript
// Subscription check pattern
import { getOrgSubscription, hasFeatureAccess } from '@/lib/billing';
import { SubscriptionTier } from '@/lib/billing/products';

const subscription = await getOrgSubscription(organizationId);

// Check feature access using tier hierarchy
const hasProAccess = hasFeatureAccess(subscription.tier, SubscriptionTier.PRO_MONTHLY);
```

#### Subscription Operations & Lifecycle

The template provides comprehensive subscription management operations through `lib/billing/operations.ts`:

##### Core Operations

1. **createCheckoutSession** - Create Stripe checkout for upgrades/new subscriptions
   - Automatically detects downgrades and creates subscription schedules instead
   - Handles both new subscriptions and tier changes
   - Returns checkout URL for redirect

2. **cancelOrgSubscription** - Cancel subscription at period end
   - Subscription remains active until current period ends (grace period)
   - Updates both Stripe and local database
   - Checks eligibility before allowing cancellation

3. **reactivateOrgSubscription** - Reactivate a canceled subscription
   - Only works during grace period (before period end)
   - Removes cancellation flag in Stripe and database
   - Restores subscription to active state

4. **createCustomerPortalSession** - Open Stripe Customer Portal
   - Allows users to manage payment methods
   - View billing history and invoices
   - Returns portal URL for redirect

5. **cancelPendingDowngrade** - Cancel a scheduled downgrade
   - Finds and cancels subscription schedule in Stripe
   - Reactivates current subscription
   - Removes downgrade tracking from database

##### Upgrade vs Downgrade Handling

The system automatically differentiates between upgrades and downgrades based on price comparison:

```typescript
// In createCheckoutSession
const currentPrice = await getTierPrice(currentSubscription.tier);
const newPrice = await getTierPrice(tier);

if (newPrice < currentPrice) {
  // DOWNGRADE: Use subscription schedule (deferred change)
  return createSubscriptionSchedule(params);
} else {
  // UPGRADE: Use immediate checkout session
  return stripe.checkout.sessions.create({...});
}
```

**Upgrade Flow (Immediate)**:

- Creates Stripe Checkout session
- User pays prorated amount immediately
- Subscription updates instantly via webhook
- Old subscription is replaced

**Downgrade Flow (Deferred)**:

- Creates subscription schedule starting at period end
- Marks current subscription for cancellation (`cancel_at_period_end: true`)
- Stores `scheduledDowngradeTier` in database
- Current subscription continues until period ends
- New lower-tier subscription activates automatically at period end

##### Subscription States

Defined in `lib/types/billing.ts`:

```typescript
export enum SubscriptionState {
  FREE = 'free', // No paid subscription
  ACTIVE = 'active', // Active paid subscription
  CANCELED_GRACE_PERIOD = 'canceled_grace_period', // Canceled but still active
  CANCELED_EXPIRED = 'canceled_expired', // Canceled and expired
  PAST_DUE = 'past_due', // Payment failed
  INCOMPLETE = 'incomplete', // Payment incomplete
  UNPAID = 'unpaid', // Payment required
}
```

##### Subscription Eligibility System

The `getSubscriptionEligibility` function (`lib/billing/eligibility.ts`) determines what actions users can take:

```typescript
export interface SubscriptionEligibility {
  canReactivate: boolean; // Can reactivate canceled subscription
  canCreateNew: boolean; // Can create new subscription
  canUpgrade: boolean; // Can upgrade/change tier
  canCancel: boolean; // Can cancel subscription
  state: SubscriptionState; // Current state
  gracePeriodEnds?: Date; // When grace period ends (if applicable)
  reason?: string; // Optional reason for restrictions
}
```

**Eligibility Rules by State**:

| State                          | canReactivate | canCreateNew | canUpgrade | canCancel |
| ------------------------------ | ------------- | ------------ | ---------- | --------- |
| FREE                           | ❌            | ✅           | ✅         | ❌        |
| ACTIVE                         | ❌            | ❌           | ✅         | ✅        |
| CANCELED_GRACE_PERIOD          | ✅            | ❌           | ❌         | ❌        |
| CANCELED_EXPIRED               | ❌            | ✅           | ✅         | ❌        |
| PAST_DUE / INCOMPLETE / UNPAID | ❌            | ✅           | ✅         | ❌        |

**Key Business Rules**:

- During grace period, users can ONLY reactivate - no new subscriptions or tier changes
- Active subscriptions can be canceled or upgraded (including downgrades via schedule)
- Free tier users can create new subscriptions or upgrade
- Expired/failed subscriptions can be replaced with new ones

##### Grace Period Handling

When a subscription is canceled, it remains active until the current period ends:

```typescript
// In getOrgSubscription
const isCancelAtPeriodEnd = activeSubscription.cancelAtPeriodEnd === 'true';
const isInGracePeriod =
  isCancelAtPeriodEnd &&
  activeSubscription.currentPeriodEnd &&
  new Date() < activeSubscription.currentPeriodEnd;

// User still has access to paid tier during grace period
if (isInGracePeriod) {
  currentTier = subscriptionTier; // Keep paid tier access
} else {
  currentTier = SubscriptionTier.FREE_MONTHLY; // Downgrade to free
}
```

##### Database Schema

The `orgSubscriptions` table tracks subscription state:

```typescript
{
  id: string;
  organizationId: string; // Foreign key to organizations
  stripeSubscriptionId: string; // Stripe subscription ID
  stripeCustomerId: string; // Stripe customer ID
  stripePriceId: string; // Stripe price ID
  tier: SubscriptionTierType; // Lookup key (e.g., 'pro_monthly')
  status: SubscriptionStatus; // active, canceled, past_due, etc.
  cancelAtPeriodEnd: string; // 'true' or 'false' (boolean as string)
  canceledAt: Date | null; // When cancellation was initiated
  scheduledDowngradeTier: string | null; // Target tier for pending downgrade
  currentPeriodStart: Date; // Billing period start
  currentPeriodEnd: Date; // Billing period end (grace period deadline)
  createdAt: Date;
  updatedAt: Date;
}
```

##### Usage Examples

**Check eligibility before showing actions**:

```typescript
import { getSubscriptionEligibility } from '@/lib/billing/eligibility';
import { getOrgSubscription } from '@/lib/billing/subscription';

const subscription = await getOrgSubscription(organizationId);
const eligibility = getSubscriptionEligibility(subscription);

if (eligibility.canCancel) {
  // Show cancel button
}

if (eligibility.canReactivate) {
  // Show reactivate button with grace period warning
  console.log(`Grace period ends: ${eligibility.gracePeriodEnds}`);
}
```

**Handle subscription operations**:

```typescript
import {
  cancelOrgSubscription,
  reactivateOrgSubscription,
  cancelPendingDowngrade
} from '@/lib/billing/operations';

// Cancel subscription
const result = await cancelOrgSubscription(organizationId, stripeSubscriptionId);
if (result.success) {
  // Show success message: subscription continues until period end
}

// Reactivate during grace period
const result = await reactivateOrgSubscription(organizationId, stripeSubscriptionId);

// Cancel a pending downgrade
const result = await cancelPendingDowngrade(organizationId);
```

**Create checkout for tier change**:

```typescript
import { createCheckoutSession } from '@/lib/billing/operations';
import { SubscriptionTier } from '@/lib/billing/products';

const result = await createCheckoutSession({
  tier: SubscriptionTier.PRO_MONTHLY,
  organizationId: org.id,
  customerEmail: user.email,
  redirectUrl: `${process.env.NEXT_PUBLIC_URL}/billing/success`,
  cancelUrl: `${process.env.NEXT_PUBLIC_URL}/billing`,
});

if (result.success && result.data?.url) {
  // System automatically detects if this is upgrade or downgrade
  // Upgrade: redirects to Stripe Checkout
  // Downgrade: creates schedule and redirects to success page
  redirect(result.data.url);
}
```

##### Webhook Integration

Subscription changes are automatically synced via Stripe webhooks at `/api/billing/webhook`.

**Key Webhook Events Handled**:

1. **customer.subscription.created** - New subscription created
   - Creates `orgSubscriptions` record
   - Links to organization via metadata
   - Sets initial tier and status

2. **customer.subscription.updated** - Subscription modified
   - Updates tier, status, billing period
   - Handles cancellation flags
   - Processes tier changes from upgrades

3. **customer.subscription.deleted** - Subscription ended
   - Marks subscription as canceled
   - Handles grace period expiration
   - Triggers downgrade to free tier

4. **invoice.payment_succeeded** / **invoice.payment_failed**
   - Updates payment status
   - Handles billing retries
   - Manages past_due state

**Important Implementation Notes**:

1. **Metadata is Critical**: Always include `organizationId` in subscription metadata

   ```typescript
   subscription_data: {
     metadata: {
       organizationId: organizationId,
       tier: tier,
     }
   }
   ```

2. **Idempotency**: Webhook handlers should be idempotent (safe to run multiple times)
   - Stripe may send duplicate webhook events
   - Use `stripeSubscriptionId` to identify existing records
   - Update operations instead of insert when record exists

3. **Async Processing**: Webhooks are the source of truth for subscription state
   - Local database operations are optimistic (update immediately)
   - Webhooks provide eventual consistency
   - Don't rely on immediate database state after Stripe API calls

4. **Error Handling**: Webhook failures are logged but don't block Stripe operations
   - Use cron sync job as backup (runs every 6 hours)
   - Manual intervention may be needed for persistent failures

##### Testing Subscription Flows

**Local Testing with Stripe CLI**:

```bash
# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/billing/webhook

# Trigger test events
stripe trigger customer.subscription.created
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

**Test Checkout Flows**:

```typescript
// Use Stripe test mode with test cards
// Card: 4242 4242 4242 4242 (Success)
// Card: 4000 0000 0000 9995 (Decline)

const session = await createCheckoutSession({
  tier: SubscriptionTier.PRO_MONTHLY,
  organizationId: testOrg.id,
  customerEmail: 'test@example.com',
  redirectUrl: 'http://localhost:3000/billing/success',
  cancelUrl: 'http://localhost:3000/billing',
});
```

**Test Grace Period**:

```typescript
// Cancel subscription
await cancelOrgSubscription(orgId, subscriptionId);

// Check eligibility during grace period
const subscription = await getOrgSubscription(orgId);
const eligibility = getSubscriptionEligibility(subscription);

expect(eligibility.state).toBe(SubscriptionState.CANCELED_GRACE_PERIOD);
expect(eligibility.canReactivate).toBe(true);
expect(subscription.tier).toBe(SubscriptionTier.PRO_MONTHLY); // Still has access

// Reactivate
await reactivateOrgSubscription(orgId, subscriptionId);
```

**Test Downgrade Scheduling**:

```typescript
// Request downgrade from Business to Pro
const result = await createCheckoutSession({
  tier: SubscriptionTier.PRO_MONTHLY,
  organizationId: orgId,
  customerEmail: user.email,
});

// Check scheduled downgrade was created
const subscription = await getOrgSubscription(orgId);
expect(subscription.activeSubscription?.scheduledDowngradeTier).toBe(SubscriptionTier.PRO_MONTHLY);
expect(subscription.tier).toBe(SubscriptionTier.BUSINESS_MONTHLY); // Still on Business

// Cancel the downgrade
await cancelPendingDowngrade(orgId);
```

##### Best Practices & Common Patterns

**1. Always Check Eligibility Before Operations**

```typescript
// ❌ DON'T: Call operation without checking
await cancelOrgSubscription(orgId, subId);

// ✅ DO: Check eligibility first
const subscription = await getOrgSubscription(orgId);
const eligibility = getSubscriptionEligibility(subscription);

if (eligibility.canCancel) {
  await cancelOrgSubscription(orgId, subId);
} else {
  // Show appropriate message based on state
  if (eligibility.state === SubscriptionState.CANCELED_GRACE_PERIOD) {
    return 'Subscription is already canceled';
  }
}
```

**2. Handle Operation Results Properly**

```typescript
// Operations return OperationResult<T>
const result = await createCheckoutSession({...});

if (result.success && result.data?.url) {
  // Success: redirect to checkout or show success message
  redirect(result.data.url);
} else {
  // Failure: show user-friendly error message
  toast.error(result.message);
}
```

**3. Use Lookup Keys, Not Price IDs**

```typescript
// ❌ DON'T: Hardcode Stripe price IDs
tier: 'price_1234567890';

// ✅ DO: Use lookup keys (type-safe constants)
tier: SubscriptionTier.PRO_MONTHLY; // 'pro_monthly'
```

**4. Respect Grace Periods**

```typescript
// During grace period, user still has paid tier access
const subscription = await getOrgSubscription(orgId);

// This will be the paid tier if still in grace period
const currentTier = subscription.tier;

// Check if in grace period
const eligibility = getSubscriptionEligibility(subscription);
if (eligibility.state === SubscriptionState.CANCELED_GRACE_PERIOD) {
  // Show warning: "Your subscription ends on {gracePeriodEnds}"
  console.log(`Access until: ${eligibility.gracePeriodEnds}`);
}
```

**5. Handle Scheduled Downgrades in UI**

```typescript
const subscription = await getOrgSubscription(orgId);

if (subscription.activeSubscription?.scheduledDowngradeTier) {
  // Show: "You will downgrade to {tier} on {date}"
  // Offer "Cancel Downgrade" button
  const targetTier = subscription.activeSubscription.scheduledDowngradeTier;
  const downgradDate = subscription.currentPeriodEnd;

  // User can cancel the downgrade
  await cancelPendingDowngrade(orgId);
}
```

**6. Organization ID vs User ID**

```typescript
// ⚠️ IMPORTANT: Use organizationId, not userId
// Subscriptions are organization-scoped, not user-scoped

// ✅ Correct
const subscription = await getOrgSubscription(organization.id);

// ❌ Wrong
const subscription = await getOrgSubscription(user.id); // This will fail
```

**7. Error Handling Pattern**

```typescript
try {
  const result = await cancelOrgSubscription(orgId, subId);

  if (!result.success) {
    // Business logic error (e.g., can't cancel, wrong subscription)
    toast.error(result.message);
    return;
  }

  // Success
  toast.success(result.message);
  revalidatePath('/billing');
} catch (error) {
  // Unexpected error (network, Stripe API, database)
  console.error('Subscription operation failed:', error);
  toast.error('An unexpected error occurred. Please try again.');
}
```

**8. Feature Gating Pattern**

```typescript
import { hasFeatureAccess } from '@/lib/billing/subscription';
import { SubscriptionTier } from '@/lib/billing/products';

// Server-side feature check
export async function POST(req: Request) {
  const subscription = await getOrgSubscription(organizationId);

  if (!hasFeatureAccess(subscription.tier, SubscriptionTier.PRO_MONTHLY)) {
    return Response.json(
      { error: 'This feature requires a Pro subscription' },
      { status: 403 }
    );
  }

  // Feature logic...
}

// Client-side UI gating
function FeatureButton() {
  const { subscription } = useSubscription();
  const hasPro = hasFeatureAccess(subscription.tier, SubscriptionTier.PRO_MONTHLY);

  return (
    <Button disabled={!hasPro}>
      {hasPro ? 'Use Feature' : 'Upgrade to Pro'}
    </Button>
  );
}
```

#### Tier Hierarchy and Feature Access

**IMPORTANT**: Each product in `lib/billing/products.json` has an explicit `tierLevel` field that defines its access level.

```json
// lib/billing/products.json
{
  "products": [
    {
      "lookupKey": "free_monthly",
      "tierLevel": 0,  // ← Explicit level: Lowest tier
      ...
    },
    {
      "lookupKey": "pro_monthly",
      "tierLevel": 1,  // ← Explicit level: Medium tier
      ...
    },
    {
      "lookupKey": "business_monthly",
      "tierLevel": 2,  // ← Explicit level: Highest tier
      ...
    }
  ]
}
```

**How `hasFeatureAccess()` works:**

```typescript
import { hasFeatureAccess } from '@/lib/billing';
import { SubscriptionTier } from '@/lib/billing/products';

// Returns true if user's tierLevel >= required tierLevel
hasFeatureAccess(userTier, requiredTier);

// Examples:
hasFeatureAccess('business_monthly', 'pro_monthly'); // ✅ true (level 2 >= 1)
hasFeatureAccess('pro_monthly', 'free_monthly'); // ✅ true (level 1 >= 0)
hasFeatureAccess('free_monthly', 'pro_monthly'); // ❌ false (level 0 < 1)
```

**Benefits of explicit tierLevel:**

1. ✅ **Self-documenting** - Tier hierarchy is explicit and obvious
2. ✅ **Flexible** - Can reorder products in JSON without breaking access
3. ✅ **Multi-interval support** - Easy to add yearly variants at the same tier level (e.g., `pro_monthly` and `pro_yearly` both use `tierLevel: 1`)
4. ✅ **Safe** - No implicit dependencies on array order
5. ✅ **Backward compatible** - Falls back to array index if tierLevel is missing

**Rules when modifying tiers:**

1. Always set explicit `tierLevel` values (0 = lowest, higher numbers = more access)
2. Multiple products can share the same tierLevel (e.g., monthly and yearly)
3. Higher tier users automatically get access to all lower tier features
4. Products can be reordered in the array for display purposes without affecting access logic

#### Free Tier & Organization Lifecycle

**All organizations start with a free tier subscription** to simplify the upgrade flow and maintain consistency:

##### Free Tier Creation

When an organization is created, the system automatically creates a free-tier Stripe subscription:

```typescript
// Called during organization creation
import { createFreeTierSubscription } from '@/lib/billing/operations';

const result = await createFreeTierSubscription({
  organizationId: org.id,
  customerEmail: user.email,
});
```

**How it works**:

1. Creates (or retrieves) Stripe customer for the organization
2. Creates Stripe subscription with free tier price (using lookup key)
3. Uses idempotency key (`free-tier-${organizationId}`) to prevent duplicates
4. Webhook handles database record creation (`orgSubscriptions` table)
5. Metadata includes `organizationId` and `tier` for webhook processing

**Race Condition Protection**:

- Database has unique constraint on `organization_id` column
- Stripe idempotency prevents duplicate subscriptions on retries
- Webhook fails gracefully if subscription record already exists
- Function checks for existing subscription before creating

##### Organization Deletion

When an organization is deleted, the system cleans up Stripe resources:

```typescript
import { deleteStripeCustomer } from '@/lib/billing/operations';

const result = await deleteStripeCustomer(organizationId);
```

**How it works**:

1. Retrieves organization's `stripeCustomerId` from database
2. Deletes customer in Stripe (automatically cancels all subscriptions)
3. Returns success even if Stripe deletion fails (logs error for manual intervention)
4. Prevents organization deletion from failing due to billing cleanup issues

**Important**: The function is graceful - it won't block organization deletion if Stripe cleanup fails, ensuring user experience isn't disrupted by payment provider issues.

##### Customer Management

**Get or Create Pattern**:
The `getOrCreateStripeCustomer` function (internal) ensures every organization has a Stripe customer:

```typescript
// Used internally by operations
async function getOrCreateStripeCustomer(
  organizationId: string,
  customerEmail: string
): Promise<string> {
  // 1. Check if org already has stripeCustomerId
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (org?.stripeCustomerId) {
    return org.stripeCustomerId; // Return existing
  }

  // 2. Create new Stripe customer
  const customer = await stripe.customers.create({
    email: customerEmail,
    name: org?.name,
    metadata: { organizationId },
  });

  // 3. Save customer ID to organization
  await db
    .update(organizations)
    .set({ stripeCustomerId: customer.id })
    .where(eq(organizations.id, organizationId));

  return customer.id;
}
```

This pattern ensures:

- Organizations can upgrade seamlessly (already have Stripe customer)
- No duplicate customers are created
- Metadata links Stripe customer to organization for webhook processing

#### Adding New Pricing Tiers

When you need to add a new tier or modify pricing:

1. **Determine the correct tier level**:

   Assign an explicit `tierLevel` that reflects where the tier fits in the access hierarchy:

   ```json
   // lib/billing/products.json - Adding "premium" between pro and business
   {
     "products": [
       { "lookupKey": "free_monthly", "tierLevel": 0, ... },
       { "lookupKey": "pro_monthly", "tierLevel": 1, ... },
       { "lookupKey": "premium_monthly", "tierLevel": 2, ... },   // ← NEW tier
       { "lookupKey": "business_monthly", "tierLevel": 3, ... }   // ← Update existing
     ]
   }
   ```

   Note: You can insert the product anywhere in the array - `tierLevel` determines access, not position.

2. **Edit Products JSON** with proper structure:

   ```json
   // Example: Adding "enterprise" as the highest tier
   {
     "lookupKey": "enterprise_monthly",
     "tierLevel": 3, // ← Higher than business (2)
     "product": {
       "name": "Enterprise",
       "description": "Custom enterprise solution"
     },
     "price": {
       "unit_amount": 99900,
       "currency": "usd",
       "recurring": {
         "interval": "month",
         "interval_count": 1
       },
       "tax_behavior": "unspecified"
     },
     "features": ["Unlimited users", "Custom integrations", "Dedicated support"]
   }
   ```

3. **Sync to Stripe**:

   ```bash
   bun run stripe:seed
   ```

4. **Update Tier Constants** (for type safety):

   ```typescript
   // lib/billing/products.ts
   export const SubscriptionTier = {
     FREE_MONTHLY: 'free_monthly',
     PRO_MONTHLY: 'pro_monthly',
     PREMIUM_MONTHLY: 'premium_monthly', // ← Add new tier
     BUSINESS_MONTHLY: 'business_monthly',
   } as const;
   ```

5. **Update tRPC Schema** (automatically synced via SubscriptionTier):

   The schema in `lib/trpc/schemas/billing.ts` automatically stays in sync because it imports and uses the `SubscriptionTier` constants:

   ```typescript
   // lib/trpc/schemas/billing.ts
   import { SubscriptionTier } from '@/lib/billing/products';

   const subscriptionTierSchema = z.enum([
     SubscriptionTier.FREE_MONTHLY,
     SubscriptionTier.PRO_MONTHLY,
     SubscriptionTier.PREMIUM_MONTHLY, // ← Auto-synced when you add to products.ts
     SubscriptionTier.BUSINESS_MONTHLY,
   ]);
   ```

   **Important**: Add the new tier constant to the enum array in the schema to enable it for checkout operations.

6. **The new tier automatically appears** in the billing UI - no hardcoded price IDs needed
7. **Feature access automatically works** based on the tierLevel you assigned

#### Development Workflow

```bash
# 1. Configure products (optional - defaults provided)
# Edit lib/billing/products.json

# 2. Sync products to Stripe
bun run stripe:seed

# 3. Test subscription flows in your app
# Products are fetched dynamically using lookup keys
```

#### Benefits Over Traditional Stripe Setup

- ✅ No manual price ID copying between Stripe dashboard and `.env`
- ✅ JSON-first configuration makes pricing changes version-controlled
- ✅ Lookup keys prevent duplicate products/prices
- ✅ Easier to maintain multiple environments (dev/staging/prod)
- ✅ Pricing updates require only JSON edit + sync script
- ✅ Free tier users still have Stripe subscriptions (simplifies upgrade flow)

#### Implementation Best Practices

When implementing billing features, prefer **explicit, clear code** over clever dynamic solutions:

```typescript
// ✅ PREFERRED - Explicit and clear (better for LLM-generated code)
export const SubscriptionTier = {
  FREE: 'free',
  PRO: 'pro',
  BUSINESS: 'business',
} as const;

export type SubscriptionTier = 'free' | 'pro' | 'business';

// ❌ AVOID - Dynamic generation (harder to understand and maintain)
const buildSubscriptionTierEnum = () => {
  const tierEnum: Record<string, string> = {};
  for (const product of productsConfig.products) {
    const enumKey = product.lookupKey.toUpperCase();
    tierEnum[enumKey] = product.lookupKey;
  }
  return tierEnum;
};
```

**Rationale:**

- Explicit types are easier for LLMs to understand and modify
- Clear type definitions improve IDE autocomplete and error detection
- Manual updates to types when adding tiers are intentional and visible
- Better code clarity for human developers reviewing AI-generated code

## Use the official SDK, never raw HTTP

**ALWAYS prefer native SDKs over HTTP requests when available. ALWAYS check the LATEST version and documentation online before implementation.**

- ✅ **Use official SDKs** - Stripe SDK, Resend SDK, Better Auth SDK, etc.
- ✅ **Check latest documentation** - Always verify current API patterns and best practices
- ✅ **Verify package versions** - Check npm/GitHub for the latest stable version
- ✅ **Follow official examples** - Use patterns from official documentation
- ❌ **NEVER use raw HTTP requests** - If an official SDK exists, use it
- ❌ **NEVER assume API patterns** - Always check current documentation

```typescript
// ✅ CORRECT - Use official Stripe SDK
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const session = await stripe.checkout.sessions.create({
  /* ... */
});

// ❌ WRONG - Raw HTTP request when SDK exists
const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
  body: JSON.stringify({
    /* ... */
  }),
});
```

**Why Use Native SDKs?**

- ✅ **Type safety** - Full TypeScript support with proper types
- ✅ **Error handling** - Built-in error handling and retries
- ✅ **Automatic updates** - SDK handles API changes gracefully
- ✅ **Better DX** - Autocomplete, documentation, and examples
- ✅ **Maintained** - Official support and bug fixes
- ✅ **Best practices** - Implements recommended patterns

Test authentication flows and subscription management thoroughly after any billing change.
