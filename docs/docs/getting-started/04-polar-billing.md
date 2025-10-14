---
sidebar_position: 5
---

# Step 4: Configure Polar Billing

Set up Polar for subscription billing, create products, and configure webhooks for real-time billing events.

## Why Polar?

Polar provides:

- Subscription management
- Multiple pricing tiers
- Automatic billing
- Webhook notifications
- Sandbox environment for testing

## Choose Your Environment

### Sandbox (Recommended for Setup)

Start with sandbox for testing:

- No real charges
- Test subscriptions
- Full feature set
- Easy transition to production

**Dashboard**: [sandbox.polar.sh/dashboard](https://sandbox.polar.sh/dashboard)

### Production

Use when ready to launch:

- Process real payments
- Live subscriptions
- Production webhook URLs

**Dashboard**: [polar.sh/dashboard](https://polar.sh/dashboard)

:::tip Start with Sandbox
Begin with sandbox mode. You can transition to production when ready to launch. See [Polar Production Guide](../production/polar-production.md) for migration steps.
:::

## Step-by-Step Setup

### 1. Create Account

1. Go to [sandbox.polar.sh](https://sandbox.polar.sh) (or production URL)
2. Sign up using GitHub or email
3. Complete the onboarding process

### 2. Create Organization

If you don't have an organization yet:

1. Click **"Create Organization"**
2. **Name**: Enter your organization name
   - Example: `Acme Inc`, `Your Startup Name`
3. **Slug**: Auto-generated URL identifier
   - Example: `acme-inc`, `your-startup`
4. Complete the setup

:::info Organization vs Project

- **Organization**: Your company/entity
- **Products**: What customers subscribe to
  :::

### 3. Create Products

You'll create two subscription products:

#### Product 1: Pro Plan

1. Go to **Products** in your Polar dashboard
2. Click **"Create Product"**
3. Configure:
   - **Name**: `Pro Plan`
   - **Description**: `Professional subscription with advanced features`
   - **Type**: `Subscription`
   - **Price**: `$20.00 USD per month`
   - **Billing Interval**: `Monthly`
4. Click **"Create Product"**
5. **Copy the Product ID** (you'll need this later)

#### Product 2: Business Plan

1. Click **"Create Product"** again
2. Configure:
   - **Name**: `Business Plan`
   - **Description**: `Business subscription with premium features and priority support`
   - **Type**: `Subscription`
   - **Price**: `$200.00 USD per month`
   - **Billing Interval**: `Monthly`
3. Click **"Create Product"**
4. **Copy the Product ID** (you'll need this later)

:::tip Save Product IDs
Store these Product IDs safely:

```
POLAR_PRO_PRODUCT_ID=prod_abc123...
POLAR_BUSINESS_PRODUCT_ID=prod_xyz789...
```

:::

### 4. Create API Token

Create an API token for programmatic access:

1. Go to **Settings** in Polar dashboard
2. Scroll to **"API Tokens"** section
3. Click **"Create Token"**
4. Configure:
   - **Name**: `your-project-name-api`
   - **Scopes**: Select these:
     - ☑️ `products:read`
     - ☑️ `products:write`
     - ☑️ `checkouts:write`
     - ☑️ `subscriptions:read`
     - ☑️ `subscriptions:write`
5. Click **"Create"**
6. **Copy the token** (starts with `polar_oat_`)

:::warning Save Token Immediately
The API token is shown only once. Copy and save it securely:

```
POLAR_ACCESS_TOKEN=polar_oat_your_token_here
```

:::

### 5. Set Up Webhook

Configure webhooks for real-time billing events:

1. In Polar dashboard, go to **"Webhooks"**
2. Click **"Add Endpoint"**
3. Configure:
   - **Endpoint URL**: `https://your-project-name.vercel.app/api/billing/webhook`
   - **Events**: Select these:
     - ☑️ `subscription.created`
     - ☑️ `subscription.updated`
     - ☑️ `subscription.canceled`
4. Click **"Create"**
5. **Copy the Signing Secret**

:::tip Webhook URL Format
Replace `your-project-name` with your actual Vercel project name:

```
https://my-awesome-app.vercel.app/api/billing/webhook
```

:::

## Save Your Configuration

You now have all Polar credentials:

```bash
# Environment
POLAR_ENVIRONMENT=sandbox  # or 'production'

# Organization
POLAR_ORGANIZATION_ID=your-org-slug

# Products
POLAR_PRO_PRODUCT_ID=prod_abc123...
POLAR_BUSINESS_PRODUCT_ID=prod_xyz789...

# API Access
POLAR_ACCESS_TOKEN=polar_oat_your_token_here

# Webhook
POLAR_WEBHOOK_SECRET=polar_webhook_secret_here
```

## Subscription Tiers

Kosuke Template includes three tiers:

| Tier         | Price      | Features                         |
| ------------ | ---------- | -------------------------------- |
| **Free**     | $0         | Basic features, limited usage    |
| **Pro**      | $20/month  | Advanced features, higher limits |
| **Business** | $200/month | All features, priority support   |

Users start on Free tier and can upgrade through the billing page.

## How Billing Works

### Subscription Flow

1. User clicks "Upgrade" in your app
2. Redirected to Polar checkout
3. Completes payment
4. Polar webhook notifies your app
5. User subscription updated in database
6. User gains access to pro features

### Automated Sync

Kosuke Template includes:

- **Webhook handling**: Real-time subscription updates
- **Cron job**: Syncs every 6 hours as backup
- **Database storage**: Subscriptions stored in PostgreSQL

## Testing in Sandbox

Polar sandbox allows testing without real payments:

### Test Subscription

1. Run your app locally or in development
2. Go to billing page
3. Click "Upgrade to Pro"
4. Use Polar's test card numbers
5. Verify subscription activates

### Test Cards

Polar provides test cards for different scenarios:

- **Success**: Various test card numbers
- **Decline**: Specific card numbers that fail
- **3D Secure**: Cards requiring authentication

Check [Polar testing docs](https://docs.polar.sh) for current test cards.

## Common Questions

### Can I change product prices later?

Yes, but consider:

- Existing subscriptions maintain old price
- Create new price points for new subscribers
- Communicate changes to customers

### How do refunds work?

Through Polar dashboard:

1. Go to subscription details
2. Click "Issue Refund"
3. Choose amount (full or partial)
4. Confirm refund

### What about failed payments?

Polar handles retry logic:

- Automatic retry after failure
- Customer notification emails
- Webhook events for each attempt
- Final cancellation if all retries fail

### Can users switch plans?

Yes! The template includes:

- Upgrade/downgrade logic
- Prorated billing
- Immediate access changes

## Next Steps

With Polar configured, set up authentication:

👉 **[Step 5: Configure Clerk Authentication](./05-clerk-auth.md)**

---

**Having issues?** Check the [Troubleshooting](../reference/troubleshooting) guide or [Polar docs](https://docs.polar.sh).
