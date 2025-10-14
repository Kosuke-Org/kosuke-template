---
sidebar_position: 2
---

# Polar Production Setup

Transition from Polar sandbox to production environment.

## Overview

Moving from sandbox to production enables real payment processing.

## Steps

### 1. Create Production Organization

1. Go to [polar.sh/dashboard](https://polar.sh/dashboard) (not sandbox)
2. Create production organization or use existing
3. Note your production organization slug

### 2. Create Production Products

Create the same products as sandbox:

**Pro Plan**:

- Name: `Pro Plan`
- Price: `$20.00 USD per month`
- Type: Subscription

**Business Plan**:

- Name: `Business Plan`
- Price: `$200.00 USD per month`
- Type: Subscription

Copy both Product IDs.

### 3. Create Production API Token

1. Go to **Settings → API Tokens**
2. Click **Create Token**
3. Name: `your-app-production`
4. Select scopes:
   - ☑️ `products:read`
   - ☑️ `products:write`
   - ☑️ `checkouts:write`
   - ☑️ `subscriptions:read`
   - ☑️ `subscriptions:write`
5. Copy token (starts with `polar_oat_`)

### 4. Update Environment Variables

In Vercel dashboard, update:

```bash
POLAR_ENVIRONMENT=production
POLAR_ACCESS_TOKEN=polar_oat_[production_token]
POLAR_ORGANIZATION_ID=[production_org_slug]
POLAR_PRO_PRODUCT_ID=[production_pro_id]
POLAR_BUSINESS_PRODUCT_ID=[production_business_id]
```

### 5. Configure Production Webhooks

1. In production Polar dashboard, go to **Webhooks**
2. Add endpoint: `https://yourdomain.com/api/billing/webhook`
3. Select events:
   - ☑️ `subscription.created`
   - ☑️ `subscription.updated`
   - ☑️ `subscription.canceled`
4. Copy signing secret
5. Update `POLAR_WEBHOOK_SECRET` in Vercel

### 6. Redeploy

Trigger a new deployment to apply changes:

```bash
git commit --allow-empty -m "Switch to Polar production"
git push
```

## Testing

1. Upgrade to Pro plan
2. Use real payment card
3. Verify subscription activates
4. Check webhook delivery
5. Test cancellation flow

## Monitoring

Monitor in Polar dashboard:

- Subscription status
- Webhook delivery
- Payment success rate
- Failed payments

## Next Steps

Configure Clerk for production:

👉 **[Clerk Production Setup](./clerk-production)**
