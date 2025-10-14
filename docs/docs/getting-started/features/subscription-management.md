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

When a user upgrades, they're redirected to Polar's secure checkout page. After successful payment, Polar sends a webhook notification to update the database, and the user immediately gains access to their new subscription tier.

### Automated Sync

- **Webhooks**: Real-time subscription updates
- **Cron Jobs**: Backup sync every 6 hours
- **Database**: Subscriptions stored in PostgreSQL

## Upgrading Plans

Users can upgrade their subscription from the billing page. The system generates a secure checkout link that redirects to Polar's hosted checkout page, handles payment processing, and automatically updates the user's subscription tier upon successful payment.

## Checking Subscription Status

The application can check a user's current subscription tier to enable or disable features. This information is stored in the database and synchronized with Polar's records through webhooks and scheduled jobs.

## Feature Gating

Features can be restricted based on subscription tier. Free tier users see upgrade prompts when attempting to access premium features, while Pro and Business users have full access to their respective feature sets.

## Subscription Sync

### Real-Time (Webhooks)

Polar sends webhook events for subscription changes (created, updated, canceled) which immediately update the database, ensuring users have instant access to their new subscription features.

### Scheduled (Cron)

A backup synchronization job runs every 6 hours to ensure data consistency. This catches any missed webhook events and keeps subscription data in perfect sync with Polar's records.

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
