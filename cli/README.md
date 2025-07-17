# 🤖 Kosuke Template Interactive Setup Guide

This interactive Python script guides you through setting up the kosuke template infrastructure step-by-step, with a perfect mix of educational manual steps and automated complex tasks.

## 🎯 What This Script Does

**Interactive Step-by-Step Setup:**

1. **🍴 GitHub Repository (Manual)** - Guided repository forking process
2. **☁️ Vercel Project (Manual)** - Guided project + Blob storage creation
3. **🔗 Neon Database (Manual)** - Guided database creation through Vercel dashboard
4. **💳 Polar Billing (Manual)** - Guided organization + product creation in dashboard
5. **🔐 Clerk Authentication (Manual)** - Guided app creation + configuration
6. **📧 Resend Email Service (Manual)** - Guided API key setup for email functionality
7. **🚨 Sentry Error Monitoring (Manual)** - Guided project creation for error tracking
8. **⚙️ Vercel Environment Variables (Critical)** - Add all env vars to ensure deployment success

**Key Features:**

- ✅ **Progress saving** - Resume anytime if interrupted
- ✅ **No upfront API key collection** - Get them when needed
- ✅ **Educational approach** - Learn each service as you go
- ✅ **Just-in-time instructions** - Detailed guides right when you need them
- ✅ **Validation at each step** - Ensures everything works before proceeding

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd cli
virtualenv venv -p 3.12
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Run the Interactive Setup

```bash
python main.py
```

That's it! The script will guide you through everything else step-by-step.

## 📋 What You'll Need (Created During Setup)

The script will guide you to create these accounts/tokens **when needed**:

### During Setup:

- **GitHub Account** (to fork repository)
- **Vercel Account** (project + storage creation via UI)
- **Polar Account** (organization + product creation via UI)
- **Clerk Account** + New Application
- **Resend Account** (email service API key)
- **Sentry Account** + New Project

## 📁 Generated Files

After completion, you'll have:

- **`.env`** - Local development environment configuration
- **`.env.prod`** - Production environment variables for Vercel
- **`.kosuke-setup-progress.json`** - Progress file (automatically deleted on completion)

## 🔄 Resume Feature

If the setup is interrupted, simply run the script again:

```bash
python main.py
```

You'll see:

```
⚠️  Found previous setup in progress (Step 3)
ℹ️  Project: my-awesome-app
ℹ️  Completed: github, vercel
Resume previous setup? (y/n): y
ℹ️  Resuming from Step 3
```

## 🚀 Next Steps

After the interactive setup completes:

1. **🚀 Your Vercel project is ready!**

   - Environment variables are already configured in Vercel
   - Deployment should work automatically
   - If needed, trigger a redeploy from your Vercel dashboard

2. **Clone your repository:**

   ```bash
   git clone https://github.com/yourusername/your-project-name.git
   cd your-project-name
   ```

3. **Copy the environment files:**

   ```bash
   cp ../cli/.env .              # Local development with localhost
   cp ../cli/.env.prod .         # Production reference (already in Vercel)
   ```

4. **Set up local database:**

   ```bash
   # Make sure you have docker-compose.yml in your project root
   docker-compose up -d postgres  # Start PostgreSQL locally
   npm run db:migrate             # Run database migrations
   ```

5. **Install dependencies:**

   ```bash
   npm install
   ```

6. **Start development:**

   ```bash
   npm run dev                   # Local development at http://localhost:3000
   ```

7. **Environment files explained:**
   - **`.env`** - Local development (localhost, docker-compose database)
   - **`.env.prod`** - Production reference (Vercel has these variables)

## ⚡ Automated Subscription Sync

Your template includes automated subscription syncing via Vercel Cron Jobs:

### 🕐 How It Works

- **Automatic Sync**: Runs every 6 hours to sync subscription data from Polar
- **Webhook Backup**: Ensures data consistency even if webhooks fail
- **Security**: Protected by `CRON_SECRET` token authentication
- **Monitoring**: Logs all sync activities in Vercel Functions

### 🔐 Security Setup

The interactive setup automatically:

1. **Generates** a secure `CRON_SECRET` token
2. **Configures** Vercel Cron to send this token
3. **Protects** the sync endpoint from unauthorized access

### 📊 Monitoring

- **Vercel Dashboard**: View cron execution logs in Functions tab
- **Manual Testing**: Test sync endpoint with proper authentication
- **Health Checks**: Built-in endpoint health monitoring

## 🚀 Going for Production

When you're ready to launch your application to production, you'll need to configure each service for production use. Here's how to transition from development/sandbox to production environments.

### 🏦 Polar

Moving from Polar sandbox to production environment:

#### 1. Create Production Organization

1. Go to **https://polar.sh/dashboard** (production, not sandbox)
2. Create a new organization or use an existing production organization
3. Note your production organization slug

#### 2. Create Production Products

1. In your production Polar dashboard, go to **Products**
2. Click **Create Product**
3. Create **Pro Plan**:
   - Name: `Pro Plan`
   - Description: `Professional subscription with advanced features`
   - Type: `Subscription`
   - Price: `$20.00 USD per month`
4. Create **Business Plan**:
   - Name: `Business Plan`
   - Description: `Business subscription with premium features and priority support`
   - Type: `Subscription`
   - Price: `$200.00 USD per month`
5. Copy both Product IDs

#### 3. Create Production API Token

1. In production Polar dashboard, go to **Settings > API Tokens**
2. Click **Create Token**
3. Name: `your-app-production`
4. Select all required scopes:
   - ☑️ `products:read`
   - ☑️ `products:write`
   - ☑️ `checkouts:write`
   - ☑️ `subscriptions:read`
   - ☑️ `subscriptions:write`
5. Copy the production token (starts with `polar_oat_`)

#### 4. Update Vercel Environment Variables

1. Go to **Vercel Dashboard > Your Project > Settings > Environment Variables**
2. Update these variables to production values:
   - `POLAR_ENVIRONMENT` = `production`
   - `POLAR_ACCESS_TOKEN` = `[your-production-token]`
   - `POLAR_ORGANIZATION_ID` = `[your-production-org-slug]`
   - `POLAR_PRO_PRODUCT_ID` = `[production-pro-product-id]`
   - `POLAR_BUSINESS_PRODUCT_ID` = `[production-business-product-id]`
3. Ensure security variables are set:
   - `CRON_SECRET` = `[auto-generated secure token for subscription sync]`

#### 5. Set Up Production Webhooks

1. In production Polar dashboard, go to **Webhooks**
2. Add endpoint: `https://your-domain.com/api/billing/webhook`
3. Select events: `subscription.created`, `subscription.updated`, `subscription.canceled`
4. Copy webhook secret and update `POLAR_WEBHOOK_SECRET` in Vercel

### ☁️ Vercel

Configuring custom domains and production settings:

#### 1. Add Custom Domain

1. Go to **Vercel Dashboard > Your Project > Settings > Domains**
2. Click **Add Domain**
3. Enter your custom domain (e.g., `yourdomain.com`)
4. Follow DNS configuration instructions:
   - **CNAME**: Point `www.yourdomain.com` to `cname.vercel-dns.com`
   - **A Record**: Point `yourdomain.com` to Vercel's IP addresses
5. Wait for DNS propagation (can take up to 48 hours)

#### 2. Update Environment Variables

Update your Vercel environment variables for production:

1. `NEXT_PUBLIC_APP_URL` = `https://yourdomain.com`
2. `POLAR_SUCCESS_URL` = `https://yourdomain.com/billing/success?checkout_id={CHECKOUT_ID}`

#### 3. SSL/HTTPS Configuration

- Vercel automatically provides SSL certificates for custom domains
- Ensure all external integrations use HTTPS URLs
- Update webhook URLs to use your custom domain

#### 4. Production Deployment Settings

1. Go to **Settings > Functions**
2. Verify function timeout settings for production workloads
3. Review **Security** settings for production use

### 🔐 Clerk

Moving Clerk from development to production:

#### 1. Upgrade to Production Instance

1. Go to **https://dashboard.clerk.com**
2. Navigate to your application
3. Go to **Settings > Plan & Billing**
4. Upgrade to a production plan (required for custom domains)

#### 2. Configure Production Domains

1. In Clerk dashboard, go to **Settings > Domain**
2. Click **Add Domain**
3. Add your production domain: `yourdomain.com`
4. Add any subdomains if needed
5. Remove development domains if no longer needed

#### 3. Update Production Keys

1. In Clerk dashboard, note that your keys automatically work for production
2. Verify in **API Keys** section:
   - Production publishable key (starts with `pk_live_`)
   - Production secret key (starts with `sk_live_`)
3. Update Vercel environment variables if keys changed:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

#### 4. Configure Production Authentication

1. **Social Connections**: Configure OAuth providers for production
   - Update redirect URLs to use your custom domain
   - Use production OAuth app credentials
2. **Email/SMS**: Configure production email provider
3. **Session Configuration**: Review session timeout settings

#### 5. Update Webhook URLs

1. In Clerk dashboard, go to **Webhooks**
2. Update webhook endpoint to: `https://yourdomain.com/api/clerk/webhook`
3. Ensure events are still selected:
   - ☑️ `user.created`
   - ☑️ `user.updated`
   - ☑️ `user.deleted`
4. Test webhook delivery in production

## 📄 License

This interactive setup guide is provided as-is under the MIT License. See the main project LICENSE for details.
