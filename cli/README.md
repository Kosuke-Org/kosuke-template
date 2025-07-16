# 🤖 Kosuke Template Interactive Setup Guide

This interactive Python script guides you through setting up the kosuke template infrastructure step-by-step, with a perfect mix of educational manual steps and automated complex tasks.

## 🎯 What This Script Does

**Interactive Step-by-Step Setup:**

1. **🍴 GitHub Repository (Manual)** - Guided repository forking process
2. **☁️ Vercel Project (Manual)** - Guided project + Blob storage creation
3. **🔗 Neon Database (Manual)** - Guided database creation through Vercel dashboard
4. **💳 Polar Billing (Manual)** - Guided organization + product creation in dashboard
5. **🔐 Clerk Authentication (Manual)** - Guided app creation + configuration
6. **⚙️ Vercel Environment Variables (Critical)** - Add all env vars to ensure deployment success

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

### No Preparation Required!

- ❌ No `.env.cli` file needed
- ❌ No upfront API key collection
- ❌ No complex prerequisite setup

## 🎯 Interactive Flow Example

```
🤖 KOSUKE TEMPLATE INTERACTIVE SETUP 🤖

ℹ️  Let's start by choosing a project name!

📋 Project name format (kebab-case):
   • Use lowercase letters, numbers, and hyphens only
   • Examples: open-idealista, my-awesome-app, startup-mvp
   • This will be your GitHub repository name and Vercel project name

Enter your project name (kebab-case): open-idealista

📍 Step 1/6: GitHub Repository (Manual)
============================================================
ℹ️  We'll guide you through forking the Kosuke template repository.

📋 Instructions:
1. Open this URL in your browser: https://github.com/filopedraz/kosuke-template
2. Click the 'Fork' button in the top-right corner
3. ⚠️  Important: Change the repository name to: open-idealista
4. Click 'Create fork'
5. Wait for the fork to complete

Press Enter when you've completed the fork...
Enter your forked repository URL: https://github.com/yourusername/open-idealista
✅ GitHub repository configured: https://github.com/yourusername/open-idealista

📍 Step 2/6: Vercel Project (Manual)
============================================================
ℹ️  We'll guide you through creating your Vercel project manually.
ℹ️  This ensures everything works correctly and you learn the platform.

📋 Create Vercel Project:
1. Go to: https://vercel.com/new
2. Click 'Import Git Repository'
3. Click 'Continue with GitHub' (if not already connected)
4. Find your repository: open-idealista
5. Click 'Import' next to your repository
6. In the configuration screen:
   • Project Name: open-idealista
   • Framework Preset: Next.js
   • Leave other settings as default
7. Click 'Deploy'
8. ⚠️ Expected: The first deployment will fail - this is normal!
   • Error: 'POSTGRES_URL environment variable is not set'
   • We'll fix this by setting up the database and storage next
   • The project will still be created successfully

Press Enter when the deployment has finished (even if failed)...

ℹ️  Now we need your Vercel project dashboard URL:
   • Go to your Vercel dashboard: https://vercel.com
   • Find your project: open-idealista
   • Copy the URL from your browser address bar

Enter your Vercel project dashboard URL (e.g., https://vercel.com/username/open-idealista): https://vercel.com/username/open-idealista
ℹ️  Your app URL will be: https://open-idealista.vercel.app (after successful redeploy)

📋 Set up Blob Storage:
1. In your Vercel dashboard, go to your project: open-idealista
2. Click on 'Storage' tab
3. Click 'Create Database'
4. Select 'Blob'
5. Name it: open-idealista-blob
6. Click 'Create'
7. ✅ That's it! Vercel automatically adds the BLOB_READ_WRITE_TOKEN to your project

Press Enter when you've created the Blob storage...
✅ Vercel project configured: https://open-idealista.vercel.app
✅ Blob storage configured - environment variables added automatically

📍 Step 3/6: Neon Database (Manual)
============================================================
ℹ️  We'll set up your Neon database through Vercel's project dashboard.

📋 Set up Neon Database:
1. In your Vercel dashboard, go to your project: open-idealista
2. Click on 'Storage' tab
3. Click 'Create Database'
4. Select 'Neon'
5. Choose 'Create New Neon Account' or 'Link Existing Account'
6. Complete the account setup/linking process
7. ✅ That's it! Vercel automatically adds the POSTGRES_URL to your project

Press Enter when you've created the Neon database...
✅ Neon database configured - environment variables added automatically

📍 Step 4/6: Polar Billing (Manual)
============================================================
ℹ️  We'll guide you through setting up Polar billing products manually.
ℹ️  This ensures everything works correctly and you learn the platform.

Use sandbox environment for testing? (y/n): y

📋 Create Polar Organization (if you don't have one):
1. Go to: https://sandbox.polar.sh/dashboard
2. If you don't have an organization yet:
   • Click 'Create Organization'
   • Name it: open-idealista-org
   • Complete the setup process
3. If you already have an organization, you can use it

Press Enter when you have an organization ready...

📋 Create Products:
1. In your Polar dashboard, go to 'Products'
2. Click 'Create Product'

⚠️ Create Product 1 - Pro Plan:
   • Name: Pro Plan
   • Description: Professional subscription with advanced features
   • Type: Subscription
   • Price: $20.00 USD per month
   • Click 'Create Product'

Press Enter when you've created the Pro Plan...

⚠️ Create Product 2 - Business Plan:
   • Name: Business Plan
   • Description: Business subscription with premium features and priority support
   • Type: Subscription
   • Price: $200.00 USD per month
   • Click 'Create Product'

Press Enter when you've created the Business Plan...

📋 Get Product IDs:
1. In your Polar dashboard, go to 'Products'
2. Click on the 'Pro Plan' product
3. Copy the Product ID from the URL or product details

Enter Pro Plan Product ID: 01234567-89ab-cdef-0123-456789abcdef

4. Go back and click on the 'Business Plan' product
5. Copy the Product ID from the URL or product details

Enter Business Plan Product ID: 01234567-89ab-cdef-0123-456789abcdef
Enter your organization slug (from the URL, e.g., 'open-idealista-org'): open-idealista-org

📋 Create Polar API Token (Required for billing operations):
1. In your Polar dashboard, go to 'Settings'
2. Scroll down to 'API Tokens' section
3. Click 'Create Token'
4. Give it a name like: open-idealista-api
5. Select scopes:
   • ☑️ products:read
   • ☑️ products:write
   • ☑️ checkouts:write
   • ☑️ subscriptions:read
   • ☑️ subscriptions:write
6. Click 'Create'
7. Copy the token (starts with 'polar_oat_')

Enter your Polar API token: polar_oat_...
✅ Polar billing configured: https://sandbox.polar.sh/dashboard/open-idealista-org
✅ Pro Plan ($20/month) and Business Plan ($200/month) products created
✅ API token configured for billing operations

📍 Step 5/6: Clerk Authentication (Manual)
============================================================
ℹ️  We'll guide you through creating your Clerk authentication app.

📋 Create Clerk Application:
1. Go to: https://dashboard.clerk.com
2. Click 'Add application'
3. Enter application name: open-idealista
4. Choose 'Next.js' as your framework
5. Click 'Create application'
6. Copy both API keys from the dashboard

Press Enter when you've created the Clerk application...
Enter Clerk Publishable Key (pk_test_...): pk_test_...
Enter Clerk Secret Key (sk_test_...): sk_test_...

📋 Set up Clerk Webhook (Required for user sync):
1. In your Clerk dashboard, go to 'Webhooks'
2. Click 'Add Endpoint'
3. Endpoint URL: https://open-idealista.vercel.app/api/clerk/webhook
4. Select events:
   • ☑️ user.created
   • ☑️ user.updated
   • ☑️ user.deleted
5. Click 'Create'
6. Copy the 'Signing Secret' (starts with 'whsec_')

Enter Clerk Webhook Signing Secret: whsec_...
✅ Clerk authentication configured!
✅ Webhook configured for user synchronization!

📍 Step 6/6: Vercel Environment Variables (Critical)
============================================================
ℹ️  We'll generate a .env.prod file with all your environment variables.
ℹ️  You can then copy and paste them into your Vercel project settings.

ℹ️  Generating .env.prod file for Vercel...
✅ .env.prod file generated successfully!
ℹ️  Use this file to copy environment variables to Vercel

📋 Add Environment Variables to Vercel:
1. Go to your Vercel dashboard: https://vercel.com
2. Find your project: open-idealista
3. Click on your project name
4. Go to 'Settings' tab
5. Click 'Environment Variables' in the sidebar
6. Open .env.prod file and copy each variable:
   • For each line in .env.prod:
   • Copy the variable name (before =)
   • Copy the variable value (after =)
   • Add to Vercel with Environment: Production, Preview, Development

💡 Important Notes:
   • POSTGRES_URL and BLOB_READ_WRITE_TOKEN are already set by Vercel
   • Skip these if they already exist in your Vercel environment variables
   • Click 'Save' after adding each variable

Press Enter when you've added all environment variables to Vercel...
✅ Vercel environment variables configured!
✅ Your deployment should now work correctly!

ℹ️  Generating .env file for local development...
✅ .env file generated for local development!
ℹ️  💡 Note: .env.prod file contains production variables for Vercel

🎉 INTERACTIVE SETUP COMPLETE! 🎉
```

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

## 🔧 Post-Setup Manual Tasks

After the script completes, you'll need to configure a few additional settings:

### 2. Polar Webhook Configuration (Optional)

For production webhook handling:

1. Go to **Webhooks** in your Polar Dashboard
2. Add endpoint: `https://your-app.vercel.app/api/billing/webhook`
3. Select events: `subscription.created`, `subscription.updated`, `subscription.canceled`
4. Copy the webhook secret and update `POLAR_WEBHOOK_SECRET` in your `.env` file

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
3. `POLAR_CANCEL_URL` = `https://yourdomain.com/billing/cancel`

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
