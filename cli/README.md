# 🤖 Kosuke Template Interactive Setup Guide

This interactive Python script guides you through setting up the kosuke template infrastructure step-by-step, with a perfect mix of educational manual steps and automated complex tasks.

## 🎯 What This Script Does

**Interactive Step-by-Step Setup:**

1. **🍴 GitHub Repository (Manual)** - Guided repository forking process
2. **☁️ Vercel Project (Manual)** - Guided project + Blob storage creation
3. **🔗 Neon Database (Manual)** - Guided database creation through Vercel dashboard
4. **💳 Polar Billing (Manual)** - Guided organization + product creation in dashboard
5. **🔐 Clerk Authentication (Manual)** - Guided app creation + configuration

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

📍 Step 1/5: GitHub Repository (Manual)
============================================================
ℹ️  We'll guide you through forking the Kosuke template repository.

📋 Instructions:
1. Open this URL in your browser: https://github.com/filopedraz/kosuke-template
2. Click the 'Fork' button in the top-right corner
3. ⚠️  Important: Change the repository name to: my-awesome-app
4. Click 'Create fork'
5. Wait for the fork to complete

Press Enter when you've completed the fork...
Enter your forked repository URL: https://github.com/yourusername/my-awesome-app
✅ GitHub repository configured: https://github.com/yourusername/my-awesome-app

📍 Step 2/5: Vercel Project (Manual)
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

📍 Step 3/5: Neon Database (Manual)
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

📍 Step 4/5: Polar Billing (Manual)
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
✅ Polar billing configured: https://sandbox.polar.sh/dashboard/open-idealista-org
✅ Pro Plan ($20/month) and Business Plan ($200/month) products created
💡 Note: Add your Polar API token to the .env file later if you need programmatic access

📍 Step 5/5: Clerk Authentication (Manual)
============================================================
ℹ️  We'll guide you through creating your Clerk authentication app.

📋 Create Clerk Application:
1. Go to: https://dashboard.clerk.com
2. Click 'Add application'
3. Enter application name: my-awesome-app
4. Choose 'Next.js' as your framework
5. Click 'Create application'
6. Copy both API keys from the dashboard

Press Enter when you've created the Clerk application...
Enter Clerk Publishable Key (pk_test_...): pk_test_...
Enter Clerk Secret Key (sk_test_...): sk_test_...
✅ Clerk authentication configured!

ℹ️  Generating .env configuration file...
✅ .env file generated successfully!

🎉 INTERACTIVE SETUP COMPLETE! 🎉
```

## 📁 Generated Files

After completion, you'll have:

- **`.env`** - Complete environment configuration
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

### 1. Clerk OAuth Providers (Required)

**Complete these steps after your app is deployed:**

1. In your Clerk application, go to **User & Authentication > Social Connections**
2. Enable **Google** OAuth provider (add your Google OAuth credentials)
3. Enable **Email & SMS** authentication
4. Go to **Webhooks** and add endpoint: `https://your-app.vercel.app/api/clerk/webhook`
5. Select events: `user.created`, `user.updated`, `user.deleted`
6. Copy the webhook secret and update your `.env` file

### 2. Polar API Token & Webhook Configuration (Optional)

If you need programmatic access to Polar (for automated billing operations):

1. Go to your **Polar Dashboard > Settings > API Tokens**
2. Create a token with scopes: `products:read`, `products:write`, `checkouts:write`
3. Update `POLAR_ACCESS_TOKEN` in your `.env` file

For webhooks:

1. Go to **Webhooks** in your Polar Dashboard
2. Add endpoint: `https://your-app.vercel.app/api/billing/webhook`
3. Select events: `subscription.created`, `subscription.updated`, `subscription.canceled`
4. Copy the webhook secret and update `POLAR_WEBHOOK_SECRET` in your `.env` file

## 🔍 Troubleshooting

### Common Issues

**❌ "First Vercel deployment failed with POSTGRES_URL error"**

- This is **completely normal and expected**
- The app needs database and storage environment variables to build
- Continue with the setup - we'll fix this with Neon and Blob storage
- You'll redeploy at the end once everything is configured

**❌ "URL should contain 'project-name'"**

- Make sure you copied the correct dashboard URL from Vercel
- URL format should be: `https://vercel.com/username/your-project-name`
- You can find this in your Vercel dashboard even if deployment failed

**❌ "Product ID not found" or other Polar issues**

- Ensure you're copying the Product ID correctly from the Polar dashboard
- Product IDs are UUIDs in format: `01234567-89ab-cdef-0123-456789abcdef`
- Make sure you're in the correct organization
- Verify you've created both Pro Plan and Business Plan products
- Check you're using the correct environment (sandbox vs production)

### Getting Help

1. **Check the detailed error messages** - The script provides specific guidance
2. **Verify each step was completed** - Don't skip any instructions
3. **Use sandbox environments** - Test with Polar sandbox before production

## 🚀 Next Steps

After the interactive setup completes:

1. **⚠️ Redeploy your Vercel project (Important!):**

   - Go to your Vercel dashboard
   - Click **'Redeploy'** or push a new commit to trigger deployment
   - This time it will work with all environment variables set!

2. **Clone your repository:**

   ```bash
   git clone https://github.com/yourusername/your-project-name.git
   cd your-project-name
   ```

3. **Copy the .env file:**

   ```bash
   cp ../cli/.env .
   ```

4. **Install dependencies:**

   ```bash
   npm install
   ```

5. **Start development:**

   ```bash
   npm run dev
   ```

6. **Complete the post-setup manual tasks** mentioned above

## 📄 License

This interactive setup guide is provided as-is under the MIT License. See the main project LICENSE for details.
