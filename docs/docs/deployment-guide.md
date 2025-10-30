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
| **Stripe** | Billing & subscriptions | Test mode       | [stripe.com](https://stripe.com) |
| **Clerk**  | Authentication          | Yes (10k MAUs)  | [clerk.com](https://clerk.com)   |
| **Resend** | Email delivery          | Yes (100/day)   | [resend.com](https://resend.com) |
| **Sentry** | Error monitoring        | Yes (5k events) | [sentry.io](https://sentry.io)   |

## Environments Overview

Kosuke Template uses a **three-tier environment strategy** for safe, controlled deployments:

### Environment Architecture

| Environment    | Branch Tracking | Deploy Trigger         | Database            | Use Case                     |
| -------------- | --------------- | ---------------------- | ------------------- | ---------------------------- |
| **Production** | None            | Git tag `v*.*.*` (GHA) | Production Neon DB  | Live users, real payments    |
| **Staging**    | main            | Auto on push           | Staging Neon DB     | Integration testing, QA      |
| **Preview**    | PR branches     | Auto on PR             | Inherits staging DB | Feature testing in isolation |

### Key Features

**Production:**

- Manual deployment via GitHub Actions tag (`v1.0.0`, `v2.1.3`)
- Production Stripe credentials (live mode)
- Production Clerk instance
- Production Neon database
- Webhook URLs use production domain

**Staging:**

- Auto-deploys on pushes to main
- Test Stripe credentials (test mode)
- Development Clerk instance
- Staging Neon database with preview branch support
- Webhook URLs use staging domain (`staging-template.kosuke.ai`)
- Full sign-up, billing, and authentication testing

**Preview:**

- Auto-deploys on pull requests
- Inherits staging database (read/write to shared staging DB)
- Test Stripe and Clerk credentials
- ⚠️ **Note**: Webhooks target staging, not preview URLs
- Use staging environment to test sign-up and billing flows

### Webhook Behavior

| Service    | Production                                   | Staging                                                            | Preview       |
| ---------- | -------------------------------------------- | ------------------------------------------------------------------ | ------------- |
| **Clerk**  | `https://yourdomain.com/api/clerk/webhook`   | `https://your-project-name-staging.vercel.app/api/clerk/webhook`   | Not available |
| **Stripe** | `https://yourdomain.com/api/billing/webhook` | `https://your-project-name-staging.vercel.app/api/billing/webhook` | Not available |

:::tip
Preview deployments are great for UI/UX testing, but always test sign-up and billing flows on staging where webhooks are active.
:::

## Step 1: Fork Repository

### Fork to Your Account

1. Visit [github.com/Kosuke-Org/kosuke-template](https://github.com/Kosuke-Org/kosuke-template)
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

### Configure Production Environment

- **Project Name**: Same as repository name
- **Framework Preset**: Next.js (auto-detected)
- **Root Directory**: `./` (default)
- **Build Settings**: Leave defaults

Click **Deploy** and wait for build (will fail - expected!).

### Set Up Blob Storage

1. In Vercel project, go to **Storage** tab
2. Click **Create Blob**
3. Name: `your-project-name-prod-blob`
4. Region: Same as your Neon production database
5. Select **Production** environment only
6. Click **Create**

Vercel automatically adds `BLOB_READ_WRITE_TOKEN` to production environment.

### Set Up Staging Environment

In Vercel project Settings:

1. Click **Environments**
2. Click **Add Environment**
3. Configure:
   - **Name**: `staging`
   - **Git branch**: `main`
   - **Auto-deploy on push**: Yes
4. Click **Create**

Create staging blob storage:

1. Go to **Storage** tab
2. Click **Create Blob**
3. Name: `your-project-name-staging-blob`
4. Region: Same as your Neon staging database
5. Select **Preview** environment only (staging inherits from preview)
6. Click **Create**

:::info
Staging environment inherits all preview environment variables (Neon staging DB, Blob storage) automatically.
:::

## Step 3: Set Up Neon Database

### Create Production Database

1. In Vercel project, go to **Storage** tab
2. Click **Create Database**
3. Select **Neon**
4. Choose:
   - **Create new Neon account** (sign up with GitHub), OR
   - **Link existing account** (if you have one)
5. Create database:
   - **Region**: Choose closest to users
   - **Name**: `your-project-name-prod`
   - **Environments**: Production only
   - **Create Database Branch for Deployment**: No
6. Click **Create**

### Create Staging Database

1. In Vercel project, go to **Storage** tab
2. Click **Create Database**
3. Select **Neon**
4. Create database:
   - **Region**: Same as production (or closest to development users)
   - **Name**: `your-project-name-staging`
   - **Environments**: Preview only (staging inherits)
   - **Create Database Branch for Deployment**: Yes (enables preview branches for PRs)
5. Click **Create**

### Automatic Configuration

Vercel adds environment variables automatically:

- `POSTGRES_URL` (Production environment) - Production Neon pooled connection
- `POSTGRES_URL` (Preview environment) - Staging Neon pooled connection

### Preview Branches

Neon automatically creates isolated database branches for pull requests when configured:

- PR opened → Database branch created
- Run migrations on preview branch automatically
- PR closed → Branch deleted
- No impact on staging data

### Configure Automated Branch Cleanup (Optional)

The template includes GitHub Actions automation to clean up preview branches when PRs are closed:

1. Go to [Neon Dashboard → Settings](https://console.neon.tech/app/settings)
2. Navigate to **API Keys** section
3. Create new API key: Click **Create API key**
4. Copy the key
5. Add to **GitHub Secrets** (Settings → Secrets and variables → Actions):
   - **Name**: `NEON_API_KEY`
   - **Secret**: [paste your Neon API key]
   - **Name**: `NEON_PROJECT_ID`
   - **Secret**: [find in Neon Dashboard → Project Settings]

The cleanup script (`.github/scripts/cleanup-neon-branch.mjs`) automatically runs when PRs close.

## Step 4: Configure Stripe Billing

### Staging: Create Test Products

Start in Stripe **test mode** for staging environment:

- Dashboard: [dashboard.stripe.com/dashboard](https://dashboard.stripe.com/dashboard)
- Click your organization name (top-left) → **Switch to a sandbox**

#### Product 1: Pro Plan

1. Go to **Products** → **Create Product**
2. Configure:
   - **Name**: `Pro Plan`
   - **Description**: `Professional subscription with advanced features`
   - **Recursion**: `Recurring`
   - **Amount**: `$20.00 USD per month`
   - **Billing Interval**: `Monthly`
3. Click **Save product**
4. Under **Pricing**, open the recurring price Stripe created
5. **Copy the Price ID**: `price_abc123...`

#### Product 2: Business Plan

1. Click **Create Product** again
2. Configure:
   - **Name**: `Business Plan`
   - **Description**: `Business subscription with premium features and priority support`
   - **Recursion**: `Recurring`
   - **Price**: `$200.00 USD per month`
   - **Billing Interval**: `Monthly`
3. Click **Save product**
4. Under **Pricing**, open the recurring price
5. **Copy the Price ID**: `price_xyz789...`

### Staging: Create Test API Credentials & Webhook

1. Go to **Developers** → **API keys**
2. Copy the **Publishable key (test mode)**: `pk_test_...`
3. Click **Reveal test key** and copy the **Secret key**: `sk_test_...`

**Set Up Test Webhook:**

1. Go to **Webhooks** → **Add Endpoint**
2. Configure:
   - **Endpoint URL**: `https://your-project-name-staging.vercel.app/api/billing/webhook`
   - **Events**:
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `invoice.paid`
     - ✅ `invoice.payment_failed`
     - ✅ `subscription_schedule.completed`
     - ✅ `subscription_schedule.canceled`
3. **Copy Signing Secret**

**Update staging environment variables in Vercel** (select **Preview** environment):

```bash
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_BUSINESS_PRICE_ID=price_abc123...
STRIPE_WEBHOOK_SECRET=whsec_xyz789...
STRIPE_SUCCESS_URL=https://your-project-name-staging.vercel.app/settings/billing
STRIPE_CANCEL_URL=https://your-project-name-staging.vercel.app/settings/billing
```

### Production: Create Live Products

When ready for production:

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Disable test mode** (top-left, switch out of sandbox)
3. Activate your Stripe account (complete verification)
4. Go to **Products** → **Create Product**
5. Create same products with same pricing:
   - **Pro Plan**: $20.00 USD per month
   - **Business Plan**: $200.00 USD per month
6. **Copy both Price IDs** (will start with `price_` in live mode)

### Production: Create Live API Credentials & Webhook

1. Go to **Developers** → **API keys** (live mode)
2. Copy the **Publishable key (live mode)**: `pk_live_...`
3. Click **Reveal live key** and copy the **Secret key**: `sk_live_...`

**Set Up Production Webhook:**

1. Go to **Webhooks** → **Add Endpoint**
2. Configure:
   - **Endpoint URL**: `https://yourdomain.com/api/billing/webhook`
   - **Events**: Same as staging (all 7 events)
3. **Copy Signing Secret**

**Update production environment variables in Vercel** (select **Production** environment):

```bash
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PRO_PRICE_ID=price_prod_...
STRIPE_BUSINESS_PRICE_ID=price_prod_...
STRIPE_WEBHOOK_SECRET=whsec_prod_...
STRIPE_SUCCESS_URL=https://yourdomain.com/settings/billing
STRIPE_CANCEL_URL=https://yourdomain.com/settings/billing
```

## Step 5: Configure Clerk Authentication

### Create Single Application

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up with GitHub
3. Click **Add application**
4. Configure:
   - **Application name**: `Your Project`
   - **Framework**: Next.js
5. Click **Create application**

### Enable Organizations

1. Go to **Settings → Organizations**
2. Toggle **Enable Organizations** to ON
3. Configure:
   - **Organization naming**: ✅ Allow custom names
   - **Default roles**: admin, member (recommended)
   - **Allow Personal Accounts**: ON
   - **Sessions Claims \_\_session**:
     ```json
     {
       "publicMetadata": "{{user.public_metadata}}"
     }
     ```
   - **Enable Organization Slugs**: ON
4. Click **Save**

### Staging: Development Environment

By default, Clerk creates a Development environment. Get your development credentials:

1. In your Clerk app dashboard, ensure **Development** is selected (top dropdown)
2. Go to **API Keys**
3. Copy the **Publishable key**: `pk_test_...`
4. Click **Reveal secret key** and copy **Secret key**: `sk_test_...`

**Set Up Development Webhook:**

1. Go to **Webhooks** → **Add Endpoint**
2. Configure:
   - **Endpoint URL**: `https://your-project-name-staging.vercel.app/api/clerk/webhook`
   - **Subscribe to events**:
     - ✅ User: `user.created`, `user.updated`, `user.deleted`
     - ✅ Organization: `organization.created`, `organization.updated`, `organization.deleted`
     - ✅ Membership: `organizationMembership.created`, `organizationMembership.updated`, `organizationMembership.deleted`
3. **Copy Signing Secret** (starts with `whsec_`)

**Update staging environment variables in Vercel** (select **Preview** environment):

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# URLs (same for both environments)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### Production: Production Environment

When ready for production:

1. In your Clerk app dashboard, click the environment dropdown (top-left)
2. Click **+ Create environment**
3. Configure:
   - **Name**: `Production`
   - **Type**: Production
4. Click **Create**

**Configure Production Domain:**

1. Go to **Settings → Domains** (Production environment)
2. Add your production domain: `yourdomain.com`
3. Configure DNS as instructed by Clerk

**Get Production Credentials:**

1. Ensure **Production** environment is selected (top dropdown)
2. Go to **API Keys**
3. Copy the **Publishable key**: `pk_live_...`
4. Click **Reveal secret key** and copy **Secret key**: `sk_live_...`

**Set Up Production Webhook:**

1. Go to **Webhooks** → **Add Endpoint**
2. Configure:
   - **Endpoint URL**: `https://yourdomain.com/api/clerk/webhook`
   - **Subscribe to events**: Same as staging (all 9 events)
3. **Copy Signing Secret**

**Update production environment variables in Vercel** (select **Production** environment):

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
CLERK_WEBHOOK_SECRET=whsec_prod_...

# URLs (same for both environments)
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

### Email Configuration (Shared)

**Same API key and from-email used for both staging and production:**

```bash
RESEND_API_KEY=re_...  # Shared - one key for both environments
RESEND_FROM_EMAIL=noreply@yourdomain.com  # Same for staging & production
RESEND_FROM_NAME=Your Project Name
```

Add to Vercel - select **both Production and Preview** environments (staging inherits from preview):

```bash
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Your Project Name
```

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

:::info
The same Sentry project is used across all environments (production, staging, preview). Errors are tagged with `environment` to distinguish them.
:::

Adjust sample rates in `sentry.*.config.ts` if needed.

**Add to Vercel environment variables** - select both **Production** and **Preview**:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://hash@region.ingest.sentry.io/project-id
```

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

## Step 9: Configure GitHub Actions Secrets

The template includes GitHub Actions for automated PR reviews and controlled production deployment. Configure repository secrets to enable these features.

### Navigate to GitHub Secrets

1. Go to your forked repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**

### Required Secrets

#### 1. Anthropic API Key (Claude AI)

Enables AI-powered PR reviews and issue assistance via Claude.

**Get API Key:**

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)

**Add to GitHub:**

- **Name**: `ANTHROPIC_API_KEY`
- **Secret**: `sk-ant-api03-...`

**Usage:**

- Mention `@claude` in pull requests for code reviews
- Mention `@claude` in issues for assistance
- Automated PR analysis and suggestions

#### 2. Fly.io API Token (Microservice Deployment)

Enables automatic deployment of the engine microservice on pull requests and pushes.

**Get API Token:**

```bash
fly auth token
```

Or via dashboard:

1. Go to [fly.io/user/personal_access_tokens](https://fly.io/user/personal_access_tokens)
2. Click **Create token**
3. Name: `github-actions-deploy`
4. Copy the token

**Add to GitHub:**

- **Name**: `FLY_API_TOKEN`
- **Secret**: `fo1_...`

**Usage:**

- Automatic engine deployment on main branch pushes
- Preview deployments for pull requests

#### 3. Vercel Deployment Tokens (Production Deployment)

Enables controlled production deployment via GitHub Actions when tags are created.

**Get Tokens:**

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name: `github-actions-prod-deploy`
4. Expiration: No expiration (or your preference)
5. Copy the token

**Add to GitHub:**

- **Name**: `VERCEL_TOKEN`
- **Secret**: [paste your Vercel token]

**Also add:**

- **Name**: `VERCEL_ORG_ID`
- **Secret**: [Find in Vercel Settings → Account → ID]

- **Name**: `VERCEL_PROJECT_ID`
- **Secret**: [Find in Vercel Project Settings → Project ID]

**Usage:**

- Automatic production deployment when tag `v*.*.*` is pushed
- Example: Create tag `git tag v1.0.0 && git push origin v1.0.0`

#### 4. OpenAI API Key (Optional)

Optional: Enables additional AI-powered code review features.

**Get API Key:**

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Click **Create new secret key**
4. Name: `github-actions-pr-review`
5. Copy the key (starts with `sk-`)

**Add to GitHub:**

- **Name**: `OPENAI_API_KEY`
- **Secret**: `sk-...`

**Usage:**

- Enhanced PR review with Codex analysis
- Code quality suggestions
- Security vulnerability detection

### Verify Configuration

After adding secrets:

1. Go to **Actions** tab in your repository
2. Secrets should be available to workflows
3. Test by creating a pull request or tag
4. Check Actions logs for successful API connections

## Step 10: Add Environment Variables

### Navigate to Vercel

1. Go to Vercel dashboard → Your project
2. Click **Settings** → **Environment Variables**

### Add All Variables

For each variable, click **Add New** and:

1. Enter **Key** and **Value**
2. Select appropriate environment(s)
3. Click **Save**

### Environment Variable Reference

**Three-tier deployment with different credentials:**

- **Preview**: Auto-deploys on pull requests using dynamic `$VERCEL_URL`. Uses staging database/credentials (webhooks can't be dynamic per PR).
- **Staging**: Auto-deploys main branch to fixed domain. Inherits database & most credentials from Preview.
- **Production**: Manual tag-triggered deployments (`git tag v*.*.*`). Separate database, live credentials, and production webhook secrets.

**Variables that differ per environment:**

| Variable                            | Preview               | Staging                                  | Production               |
| ----------------------------------- | --------------------- | ---------------------------------------- | ------------------------ |
| `NEXT_PUBLIC_APP_URL`               | `https://$VERCEL_URL` | `https://your-staging-domain.vercel.app` | `https://yourdomain.com` |
| `STRIPE_SUCCESS_URL`                | Staging domain        | Staging domain                           | Prod domain              |
| `STRIPE_CANCEL_URL`                 | Staging domain        | Staging domain                           | Prod domain              |
| `STRIPE_WEBHOOK_SECRET`             | `we_...` (staging)    | `we_...` (staging)                       | `whsec_...` (prod)       |
| `STRIPE_SECRET_KEY`                 | `sk_test_...`         | `sk_test_...`                            | `sk_live_...`            |
| `STRIPE_PUBLISHABLE_KEY`            | `pk_test_...`         | `pk_test_...`                            | `pk_live_...`            |
| `CLERK_SECRET_KEY`                  | `sk_test_...`         | `sk_test_...`                            | `sk_live_...`            |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...`         | `pk_test_...`                            | `pk_live_...`            |
| `CLERK_WEBHOOK_SECRET`              | Dev webhook           | Dev webhook                              | Prod webhook             |
| `NODE_ENV`                          | (not set)             | (not set)                                | `production`             |
| `CRON_SECRET`                       | (not set)             | (not set)                                | Random token             |
| `POSTGRES_URL`                      | Staging DB            | Staging DB                               | Prod DB                  |
| `BLOB_READ_WRITE_TOKEN`             | Staging blob          | Staging blob                             | Prod blob                |

**Shared across all environments (identical):**

- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_FROM_NAME` (one API key, same email)
- `NEXT_PUBLIC_SENTRY_DSN` (one project, environment-tagged)
- `ENGINE_BASE_URL` (same microservice)
- All `NEXT_PUBLIC_CLERK_SIGN_*` URLs (`/sign-in`, `/sign-up`, `/onboarding`)
- `STRIPE_PRO_PRICE_ID`, `STRIPE_BUSINESS_PRICE_ID` (same prices in test/live mode)

**Key Facts:**

- ✅ Preview & Staging use identical credentials (except `NEXT_PUBLIC_APP_URL`)
- ✅ Only Production has live credentials for Stripe/Clerk
- ✅ Database and blob storage auto-configured by Vercel per environment

### Redeploy

Trigger new staging deployment:

```bash
git commit --allow-empty -m "Configure environment variables"
git push origin main
```

Trigger new production deployment:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Or in Vercel: **Deployments** → **⋯** → **Redeploy** (production only).

### Verify Deployment

**Staging:**

1. ✅ Deployment status: **Ready**
2. Visit: `https://your-staging-domain.vercel.app`
3. Test sign-in/sign-up
4. Verify no errors in console

**Production:**

1. ✅ Deployment status: **Ready**
2. Visit: `https://yourdomain.com`
3. Test sign-in/sign-up with real payment test cards
4. Verify no errors in Sentry

**🎉 Your staging and production environments are now live!**

## Deployment Workflow

### Staging Deployment

Push to `main` for automatic staging deployment:

```bash
git commit -m "Feature: add new feature"
git push origin main
# → Automatically deploys to staging environment
```

### Production Deployment

Create a git tag to trigger production deployment via GitHub Actions:

```bash
git tag v1.0.0
git push origin v1.0.0
# → GitHub Actions automatically deploys to production
```

The workflow will:

1. Update version files (package.json, pyproject.toml, .version)
2. Build and push Docker images
3. Create GitHub Release with release notes
4. Deploy to Vercel production

Check **Actions** tab to verify deployment succeeded.
