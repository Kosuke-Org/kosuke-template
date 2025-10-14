---
sidebar_position: 2
---

# Polar Billing

Complete reference for Polar billing and subscriptions.

## Overview

Polar provides subscription billing and payment processing for Kosuke Template.

## Dashboard

- **Sandbox**: [sandbox.polar.sh/dashboard](https://sandbox.polar.sh/dashboard)
- **Production**: [polar.sh/dashboard](https://polar.sh/dashboard)

## Configuration

### API Token

Found in **Settings → API Tokens**:

```bash
POLAR_ACCESS_TOKEN=polar_oat_...
```

**Scopes needed**:

- `products:read`
- `products:write`
- `checkouts:write`
- `subscriptions:read`
- `subscriptions:write`

### Products

Create in **Products** section:

**Pro Plan**: $20/month
**Business Plan**: $200/month

```bash
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_BUSINESS_PRODUCT_ID=prod_...
```

### Webhooks

Found in **Webhooks** section:

**Endpoint**: `https://yourdomain.com/api/billing/webhook`

**Events**:

- `subscription.created`
- `subscription.updated`
- `subscription.canceled`

```bash
POLAR_WEBHOOK_SECRET=polar_webhook_...
```

## Subscription Management

### Create Checkout

```typescript
import { createCheckout } from '@/lib/billing';

const checkoutUrl = await createCheckout({
  productId: POLAR_PRO_PRODUCT_ID,
  userId,
  successUrl: '/billing/success',
});

// Redirect user to checkout
redirect(checkoutUrl);
```

### Cancel Subscription

```typescript
import { cancelSubscription } from '@/lib/billing';

await cancelSubscription(subscriptionId);
```

### Update Subscription

Upgrades/downgrades handled automatically:

- User clicks upgrade/downgrade
- Redirects to Polar checkout
- Polar handles prorated billing
- Webhook updates database

## Webhook Events

### subscription.created

Fires when new subscription created:

```typescript
{
  type: 'subscription.created',
  data: {
    id: 'sub_...',
    customer_id: 'cus_...',
    product_id: 'prod_...',
    status: 'active',
    current_period_end: '2025-11-14T...',
  }
}
```

### subscription.updated

Fires when subscription changes:

- Plan upgrade/downgrade
- Payment method updated
- Billing cycle change

### subscription.canceled

Fires when subscription ends:

- User cancels
- Payment fails permanently
- Admin cancels

## Testing

### Sandbox Mode

Test without real charges:

```bash
POLAR_ENVIRONMENT=sandbox
```

**Test Cards**: Check Polar documentation for current test card numbers.

### Test Scenarios

1. **Successful Subscription**:
   - Create checkout
   - Complete payment
   - Verify webhook received
   - Check database updated

2. **Failed Payment**:
   - Use declining test card
   - Verify error handling
   - Check retry logic

3. **Cancellation**:
   - Cancel subscription
   - Verify webhook received
   - Check access revoked

## Subscription Sync

### Real-Time (Webhooks)

Immediate updates:

```
Polar Event → Webhook → Database Update → User Access Updated
```

### Scheduled (Cron)

Backup sync every 6 hours:

```
Vercel Cron → Polar API → Database Sync
```

Ensures consistency if webhooks fail.

## Customer Portal

Polar provides customer portal:

- Manage payment methods
- View invoices
- Update billing details
- Cancel subscription

Link from your app:

```typescript
const portalUrl = `https://polar.sh/subscriptions`;
```

## Refunds

Process refunds in Polar dashboard:

1. Go to subscription
2. Click **Issue Refund**
3. Choose amount (full or partial)
4. Confirm refund
5. Webhook fires: `subscription.updated`

## Analytics

View in Polar dashboard:

### Revenue Metrics

- MRR (Monthly Recurring Revenue)
- Total revenue
- Revenue by product

### Subscription Metrics

- Active subscriptions
- New subscriptions
- Cancellations
- Churn rate

### Product Performance

- Conversions by product
- Upgrade/downgrade rates
- Popular plans

## Limits & Quotas

### Sandbox

- Unlimited test subscriptions
- All features available
- No real charges

### Production

- No subscription limits
- Standard Stripe fees
- Polar platform fee

## Resources

- [Polar Documentation](https://docs.polar.sh)
- [API Reference](https://docs.polar.sh/api)
- [Webhooks Guide](https://docs.polar.sh/webhooks)
