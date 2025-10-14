---
sidebar_position: 2
---

# Deployment Guide

Deploy Kosuke Template to production in 60-90 minutes. This guide covers forking the repository, setting up all services, and configuring your production environment.

## Prerequisites

### Required Accounts

Create accounts with these services (all have free tiers):

| Service    | Purpose                 | Free Tier       | Sign Up                          |
| ---------- | ----------------------- | --------------- | -------------------------------- |
| **GitHub** | Source code hosting     | Yes             | [github.com](https://github.com) |
| **Vercel** | Application hosting     | Yes (Hobby)     | [vercel.com](https://vercel.com) |
| **Neon**   | PostgreSQL database     | Yes (3 GB)      | Via Vercel integration           |
| **Fly.io** | Microservice hosting    | Yes (3 VMs)     | [fly.io](https://fly.io)         |
| **Polar**  | Billing & subscriptions | Sandbox mode    | [polar.sh](https://polar.sh)     |
| **Clerk**  | Authentication          | Yes (10k MAUs)  | [clerk.com](https://clerk.com)   |
| **Resend** | Email delivery          | Yes (100/day)   | [resend.com](https://resend.com) |
| **Sentry** | Error monitoring        | Yes (5k events) | [sentry.io](https://sentry.io)   |

## Step 1: Fork Repository

### Fork to Your Account

1. Visit [github.com/filopedraz/kosuke-template](https://github.com/filopedraz/kosuke-template)
2. Click **Fork** button (top-right)
3. Configure fork:
   - **Owner**: Your GitHub account
   - **Repository name**: `your-project-name` (kebab-case)
   - **Copy main branch only**: ✅ Checked
4. Click **Create fork**

**Good Names**: `my-saas`, `startup-mvp`, `customer-portal`  
**Avoid**: `My App`, `MyApp123`, `my_app`

## Step 2: Create Vercel Project

### Import Repository

1. Go to [vercel.com/new](https://vercel.com/new)
2. Sign in with GitHub
3. Click **Import Git Repository**
4. Select your forked repository
5. Click **Import**

### Configure Project

- **Project Name**: Same as repository name
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Build Settings**: Leave defaults

### Deploy

Click **Deploy** and wait for build.

:::warning Expected Failure
First deployment will fail with:

```
Error: POSTGRES_URL environment variable is not set
```

This is expected! We'll fix this in the next steps.
:::

### Set Up Blob Storage

1. In Vercel project, go to **Storage** tab
2. Click **Create Database**
3. Select **Blob**
4. Name: `your-project-name-blob`
5. Click **Create**

Vercel automatically adds `BLOB_READ_WRITE_TOKEN` environment variable.

## Step 3: Set Up Neon Database

### Create via Vercel Integration

1. In Vercel project, go to **Storage** tab
2. Click **Create Database**
3. Select **Neon**
4. Choose:
   - **Create new Neon account** (sign up with GitHub), OR
   - **Link existing account** (if you have one)
5. Create database:
   - **Region**: Choose closest to users
   - **Name**: `your-project-name-db`
   - **Environments**: Production, Preview, Development
   - **Create Database Branch for Deployment**: Preview
6. Click **Create**

### Automatic Configuration

Vercel adds these environment variables:

- `POSTGRES_URL` (pooled connection - **we use this**)

### Preview Branches

Neon automatically creates database branches for pull requests:

- PR opened → Database branch created
- PR closed → Branch deleted
- Isolated testing per PR

## Step 4: Configure Polar Billing

:::warning

Will be removed in the future.

:::

### Choose Environment

Start with **sandbox** for testing (transition to production later):

- Dashboard: [sandbox.polar.sh/dashboard](https://sandbox.polar.sh/dashboard)
- No real charges
- Full feature testing

### Create Account & Organization

1. Go to [sandbox.polar.sh](https://sandbox.polar.sh)
2. Sign up (GitHub or email)
3. Create organization:
   - **Name**: Your company name
   - **Slug**: Auto-generated URL identifier

### Create Products

#### Product 1: Pro Plan

1. Go to **Products** → **Create Product**
2. Configure:
   - **Name**: `Pro Plan`
   - **Description**: `Professional subscription with advanced features`
   - **Type**: `Subscription`
   - **Price**: `$20.00 USD per month`
   - **Billing Interval**: `Monthly`
3. **Copy Product ID**: `prod_abc123...`

#### Product 2: Business Plan

1. Click **Create Product** again
2. Configure:
   - **Name**: `Business Plan`
   - **Description**: `Business subscription with premium features and priority support`
   - **Type**: `Subscription`
   - **Price**: `$200.00 USD per month`
   - **Billing Interval**: `Monthly`
3. **Copy Product ID**: `prod_xyz789...`

### Create API Token

1. Go to **Settings** → **API Tokens**
2. Click **Create Token**
3. Configure:
   - **Name**: `your-project-api`
   - **Scopes**: ✅ `products:read`, `products:write`, `checkouts:write`, `subscriptions:read`, `subscriptions:write`
4. **Copy token** (starts with `polar_oat_`)

### Set Up Webhook

1. Go to **Webhooks** → **Add Endpoint**
2. Configure:
   - **Endpoint URL**: `https://your-project-name.vercel.app/api/billing/webhook`
   - **Events**: ✅ `subscription.created`, `subscription.updated`, `subscription.canceled`
3. **Copy Signing Secret**

**Update the environment variables in Vercel**:

```bash
POLAR_ENVIRONMENT=sandbox
POLAR_ORGANIZATION_ID=your-org-slug
POLAR_PRO_PRODUCT_ID=prod_abc123...
POLAR_BUSINESS_PRODUCT_ID=prod_xyz789...
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=polar_webhook_...
```

## Step 5: Configure Clerk Authentication

### Create Account & Application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up with GitHub
3. Click **Add application**
4. Configure:
   - **Application name**: Your project name
   - **Framework**: Next.js
5. Click **Create application**

### Get API Keys

Copy these keys immediately:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Enable Organizations

1. Go to **Settings → Organizations**
2. Toggle **Enable Organizations** to ON
3. Configure:
   - **Organization naming**: ✅ Allow custom names
   - **Default roles**: admin, member (recommended)
   - **Allow Personal Accounts**: ON
   - **Sessions Claims __session**:
      ```json
      {
         "publicMetadata": "{{user.public_metadata}}"
      }
      ```
   - **Enable Organization Slugs**: ON
4. Click **Save**

### Set Up Webhook

1. Go to **Webhooks** → **Add Endpoint**
2. Configure:
   - **Endpoint URL**: `https://your-project-name.vercel.app/api/clerk/webhook`
   - **Subscribe to events**:
     - ✅ User: `user.created`, `user.updated`, `user.deleted`
     - ✅ Organization: `organization.created`, `organization.updated`, `organization.deleted`
     - ✅ Membership: `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`
3. **Copy Signing Secret** (starts with `whsec_`)

**Update the environment variables in Vercel**:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# URLs (use these exact values)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

## Step 6: Configure Resend Email

### Create Account & API Key

1. Go to [resend.com](https://resend.com)
2. Sign up with email
3. Verify email address
4. Go to **API Keys** → **Create API Key**
5. Configure:
   - **Name**: `your-project-api`
   - **Permission**: Full access
6. **Copy API key** (starts with `re_`)

### Email Configuration

For development, use Resend's test domain:

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Your Project Name
# RESEND_REPLY_TO=support@yourdomain.com  # Optional
```

For production, verify your custom domain:

1. Go to **Domains** → **Add Domain**
2. Enter `yourdomain.com`
3. Add DNS records (SPF, DKIM, DMARC)
4. Wait for verification
5. Update: `RESEND_FROM_EMAIL=hello@yourdomain.com`

## Step 7: Configure Sentry Monitoring

### Create Account & Project

1. Go to [sentry.io](https://sentry.io)
2. Sign up with GitHub
3. Click **Create Project**
4. Configure:
   - **Platform**: Next.js
   - **Project name**: your-project-name
   - **Team**: Default team
5. Click **Create Project**

### Get DSN

Copy your DSN:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://hash@region.ingest.sentry.io/project-id
```

Find it in: **Settings → Projects → [Your Project] → Client Keys (DSN)**

### Configuration

The template includes Sentry configuration with:

- Error tracking enabled
- Performance monitoring (10% sample rate)
- Session replay (10% normal, 100% on errors)
- Automatic source map upload

Adjust sample rates in `sentry.*.config.ts` if needed.

## Step 8: Deploy Engine Microservice (Fly.io)

The template includes a Python FastAPI microservice that runs on Fly.io. This service provides additional backend functionality and can be extended with custom business logic.

### Install Fly CLI

**macOS:**

```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell):**

```powershell
pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**Linux:**

```bash
curl -L https://fly.io/install.sh | sh
```

Verify installation:

```bash
fly version
```

### Create Fly.io Account

1. Sign up at [fly.io](https://fly.io/app/sign-up)
2. Log in via CLI:

```bash
fly auth login
```

### Deploy Engine Service

1. Navigate to engine directory:

```bash
cd engine
```

2. Launch application:

```bash
fly launch
```

3. Configure deployment:
   - **App name**: `your-project-engine` (or use auto-generated)
   - **Region**: Choose closest to users (same as Neon database)
   - **PostgreSQL**: No (we use Neon)
   - **Redis**: No (unless needed)
   - **Deploy now**: No (set secrets first)

4. Copy your app URL: `https://your-project-engine.fly.dev`

### Set Environment Variables

Set secrets for the engine service via CLI:

```bash
# Sentry monitoring (use same DSN as main app)
fly secrets set SENTRY_DSN=https://hash@region.ingest.sentry.io/project-id

# Frontend URL for CORS configuration
fly secrets set FRONTEND_URL=https://your-project-name.vercel.app

# API secret key for authentication (generate with: openssl rand -base64 32)
fly secrets set API_SECRET_KEY=<random-secure-token>
```

**Generate secure API key:**

```bash
openssl rand -base64 32
```

**Alternative: Set via Fly.io Dashboard:**

You can also manage secrets through the web UI:

1. Go to [fly.io/dashboard](https://fly.io/dashboard)
2. Select your app → **Secrets**
3. Click **Add Secret** for each variable
4. Enter **Name** and **Value**
5. Click **Set Secret**

:::tip
CLI secrets automatically trigger a deployment. Dashboard secrets require manual deployment via `fly deploy` or the UI.
:::

### Deploy

```bash
fly deploy
```

Wait for deployment to complete (~2-3 minutes).

### Verify Deployment

Test health endpoint:

```bash
curl https://your-project-engine.fly.dev/health
```

Expected response:

```json
{
  "status": "healthy",
  "service": "engine-service",
  "timestamp": "2025-10-14T10:00:00.000000"
}
```

Visit API docs: `https://your-project-engine.fly.dev/docs`

### Fly.io Configuration

The engine is configured to:

- **Auto-scale**: Scales to 0 when idle (free tier friendly)
- **Auto-start**: Starts on first request (2-3s cold start)
- **Health checks**: Monitors `/health` endpoint every 30s
- **HTTPS**: Forced HTTPS with automatic certificates
- **Region**: Deploys to your selected region

**Cost**: Free tier includes 3 shared-cpu VMs with 256MB RAM each.

## Step 9: Add Environment Variables

### Navigate to Vercel

1. Go to Vercel dashboard → Your project
2. Click **Settings** → **Environment Variables**

### Add All Variables

For each variable, click **Add New** and:

1. Enter **Key** and **Value**
2. Select **Production**, **Preview**, and **Development**
3. Click **Save**

### Complete Variable List

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Polar Billing
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_ENVIRONMENT=sandbox
POLAR_ORGANIZATION_ID=your-org-slug
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_BUSINESS_PRODUCT_ID=prod_...
POLAR_WEBHOOK_SECRET=polar_webhook_...

# Sentry Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...

# Resend Email
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Your Project Name

# Engine Microservice
ENGINE_BASE_URL=https://your-project-engine.fly.dev

# Application
NEXT_PUBLIC_APP_URL=https://your-project-name.vercel.app
NODE_ENV=production

# Cron Security (generate with: openssl rand -base64 32)
CRON_SECRET=<random-secure-token>

# Database & Storage (already added by Vercel)
# POSTGRES_URL=postgresql://...@neon.tech/...
# BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

### Redeploy

Trigger new deployment:

```bash
git commit --allow-empty -m "Configure environment variables"
git push
```

Or in Vercel: **Deployments** → **⋯** → **Redeploy**

### Verify Deployment

1. ✅ Deployment status: **Ready**
2. Visit: `https://your-project-name.vercel.app`
3. Test sign-in/sign-up
4. Verify no errors in console

**🎉 Your application is now live!**

## Going to Production

When ready to launch with real payments and custom domain:

### Transition Polar to Production

1. Go to [polar.sh/dashboard](https://polar.sh/dashboard) (not sandbox)
2. Create production organization
3. Create same products (Pro $20, Business $200)
4. Create production API token with same scopes
5. Set up webhook: `https://yourdomain.com/api/billing/webhook`
6. Update environment variables:
   ```bash
   POLAR_ENVIRONMENT=production
   POLAR_ACCESS_TOKEN=polar_oat_[production_token]
   POLAR_ORGANIZATION_ID=[production_org_slug]
   POLAR_PRO_PRODUCT_ID=[production_pro_id]
   POLAR_BUSINESS_PRODUCT_ID=[production_business_id]
   POLAR_WEBHOOK_SECRET=[production_webhook_secret]
   ```
7. Redeploy

### Configure Custom Domain

#### Add Domain to Vercel

1. Go to **Settings → Domains**
2. Click **Add Domain**
3. Enter `yourdomain.com`
4. Configure DNS:

**A Record** (root domain):

```
Type: A
Name: @
Value: 76.76.21.21
```

**CNAME Record** (www):

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

5. Wait for verification (up to 48 hours, usually 1-2 hours)

#### Update Environment Variables

**Vercel:**

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
# ENGINE_BASE_URL remains the same (Fly.io subdomain)
```

**Fly.io Engine:**

```bash
fly secrets set FRONTEND_URL=https://yourdomain.com
```

#### Update Service Webhooks

Update webhook URLs in all services:

- **Clerk**: `https://yourdomain.com/api/clerk/webhook`
- **Polar**: `https://yourdomain.com/api/billing/webhook`

### Configure Clerk for Production

1. **Settings → Domain**: Add `yourdomain.com`
2. **Webhooks**: Update endpoint URL to production domain
3. **OAuth Providers** (optional):
   - Configure Google OAuth with production credentials
   - Configure GitHub OAuth with production credentials
   - Update redirect URIs to production domain

### Configure Resend Custom Domain

1. Go to Resend dashboard → **Domains**
2. Click **Add Domain**
3. Enter `yourdomain.com`
4. Add DNS records:

**SPF Record**:

```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

**DKIM Record**:

```
Type: TXT
Name: resend._domainkey
Value: [provided by Resend]
```

**DMARC Record** (recommended):

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

5. Wait for verification
6. Update environment variable:
   ```bash
   RESEND_FROM_EMAIL=hello@yourdomain.com
   ```