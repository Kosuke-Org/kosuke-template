---
sidebar_position: 2
---

# Subscription Management

Complete billing and subscription management powered by Polar.

## Subscription Tiers

| Tier         | Price      | Features                         |
| ------------ | ---------- | -------------------------------- |
| **Free**     | $0         | Basic features, limited usage    |
| **Pro**      | $20/month  | Advanced features, higher limits |
| **Business** | $200/month | All features, priority support   |

## How It Works

### Subscription Flow

```
1. User clicks "Upgrade" → 2. Polar checkout → 3. Payment
→ 4. Webhook notification → 5. Database update → 6. Access granted
```

### Automated Sync

- **Webhooks**: Real-time subscription updates
- **Cron Jobs**: Backup sync every 6 hours
- **Database**: Subscriptions stored in PostgreSQL

## Upgrading Plans

Users can upgrade from the billing page:

```typescript
// Redirect to Polar checkout
const checkoutUrl = await createCheckout({
  productId: POLAR_PRO_PRODUCT_ID,
  userId,
});

redirect(checkoutUrl);
```

## Checking Subscription Status

```typescript
import { getUserSubscription } from '@/lib/billing';

const subscription = await getUserSubscription(userId);

if (subscription.tier === 'pro') {
  // User has pro features
}
```

## Feature Gating

Gate features based on subscription:

```typescript
export default async function Page() {
  const subscription = await getUserSubscription(userId);

  if (subscription.tier === 'free') {
    return <UpgradePrompt />;
  }

  return <ProFeature />;
}
```

## Subscription Sync

### Real-Time (Webhooks)

```
Polar Event → /api/billing/webhook → Database Update
```

Events handled:

- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

### Scheduled (Cron)

Runs every 6 hours:

```
Vercel Cron → /api/cron/sync-subscriptions → Polar API → Database Update
```

Ensures data consistency if webhooks fail.

## Managing Subscriptions

Users can:

- View current plan
- Upgrade/downgrade
- Cancel subscription
- View billing history

Admins can:

- Issue refunds
- Cancel subscriptions
- View all subscriptions

## Testing

### Sandbox Mode

Test billing without real charges:

1. Use `POLAR_ENVIRONMENT=sandbox`
2. Use Polar test cards
3. Verify subscription activation
4. Test cancellation flow

## Next Steps

Learn about other features:

👉 **[Email System](./email-system)**

---

**Questions?** Check the [Polar docs](https://docs.polar.sh).
