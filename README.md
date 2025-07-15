# Kosuke Template

A modern Next.js 15 template with TypeScript, Clerk authentication, Polar Billing, Vercel Blob, PostgreSQL database, Shadcn UI, and Tailwind CSS.

## 🚀 Features

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Clerk Authentication** for user management
- **PostgreSQL** database with Drizzle ORM
- **Shadcn UI** components with Tailwind CSS
- **Polar** billing integration
- **Profile image uploads** with Vercel Blob
- **Responsive design** with dark/light mode
- **Comprehensive testing** setup with Jest

## 🛠 Setup Instructions

### Database Setup

We use PostgreSQL as the database. You can run it locally using Docker:

```bash
cp .env.example .env
docker compose up -d
```

Set up the following database environment variables in your `.env` file:

```
POSTGRES_URL=
POSTGRES_DB=
POSTGRES_USER=
POSTGRES_PASSWORD=
```

### Clerk Authentication Setup

#### Create a Clerk Application

1. Sign up at [clerk.com](https://clerk.com) if you haven't already
2. Create a new application in the [Clerk Dashboard](https://dashboard.clerk.com)
3. Choose your preferred social providers (Google, GitHub, etc.)
4. Configure your application settings

#### Environment Variables

Add the following Clerk environment variables to your `.env` file:

```
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Clerk URLs (customize these based on your app structure)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Clerk Webhook (for user synchronization)
CLERK_WEBHOOK_SECRET=whsec_...
```

#### Configure Webhooks

For user synchronization with your local database:

1. Go to **Webhooks** in your Clerk Dashboard
2. Click **Add Endpoint**
3. Set the endpoint URL to: `https://your-domain.com/api/clerk/webhook`
4. Select the following events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy the webhook secret to your `CLERK_WEBHOOK_SECRET` environment variable

### Polar Billing Setup

#### Create a Polar Account

1. Sign up at [polar.sh](https://polar.sh) if you haven't already
2. Create a new organization in the [Polar Dashboard](https://polar.sh/dashboard)
3. Complete your organization setup and verify your account

#### Create Products

1. Navigate to **Products** in your Polar Dashboard
2. Click **Create Product**
3. Create your subscription products (e.g., "Pro Plan", "Business Plan")
4. Configure pricing, billing intervals, and features
5. Note down the Product IDs for each plan

#### Generate Access Token

1. Go to **Settings** → **API** in your Polar Dashboard
2. Click **Create Access Token**
3. Give it a descriptive name (e.g., "Production API Token")
4. Select appropriate scopes:
   - `products:read`
   - `subscriptions:read`
   - `subscriptions:write`
   - `checkouts:write`
   - `webhooks:read`
5. Copy the access token immediately (it won't be shown again)

#### Environment Variables

Add the following Polar environment variables to your `.env` file:

```bash
# Polar Billing
POLAR_ACCESS_TOKEN=polar_at_...
POLAR_ENVIRONMENT=sandbox # Use 'sandbox' for testing, 'production' for live
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_BUSINESS_PRODUCT_ID=prod_...
```

#### Configure Webhooks (Optional)

For real-time subscription updates:

1. Go to **Webhooks** in your Polar Dashboard
2. Click **Add Endpoint**
3. Set the endpoint URL to: `https://your-domain.com/api/billing/webhook`
4. Select the following events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.canceled`
   - `subscription.revoked`
5. Copy the webhook secret for your environment variables

### Vercel Blob Setup

#### Create Vercel Blob Storage

1. Log into your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to **Storage** tab
3. Click **Create Database** → **Blob**
4. Choose a name for your blob store
5. Select your preferred region

#### Environment Variables

Add the following Vercel Blob environment variables to your `.env` file:

```bash
# Vercel Blob for file uploads
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

### Database Migration

Generate and run database migrations:

```bash
npm run db:generate
npm run db:migrate
```

### Run the Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## 🧪 Testing

Run tests with:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 📦 Available Scripts

```bash
npm run dev           # Start development server
npm run build         # Build for production
npm run start         # Start production server
npm run lint          # Run ESLint
npm run format        # Format code with Prettier
npm run db:generate   # Generate database migrations
npm run db:migrate    # Run database migrations
npm run db:push       # Push schema changes
npm run db:studio     # Open Drizzle Studio
npm run db:seed       # Seed database
```

## 🚀 Deployment

### Database: Neon Postgres

#### Setup Neon Database

1. Sign up at [neon.tech](https://neon.tech) if you haven't already
2. Create a new project in the [Neon Console](https://console.neon.tech)
3. Choose your preferred region
4. Copy the connection string from the **Connection Details** section

#### Environment Variables

Update your production environment variables:

```bash
# Neon Postgres (replace local Docker database)
POSTGRES_URL="postgresql://username:password@hostname/database?sslmode=require"
```

#### Database Migration

Run migrations on your production database:

```bash
npm run db:migrate
```

### Storage: Vercel Blob

#### Production Setup

1. In your [Vercel Dashboard](https://vercel.com/dashboard), go to your project
2. Navigate to **Storage** tab
3. Connect your existing Blob store or create a new one for production
4. Copy the production `BLOB_READ_WRITE_TOKEN`

### Deployment: Vercel (Recommended)

#### Deploy to Vercel

1. Connect your repository to [Vercel](https://vercel.com)
2. Import your project from GitHub/GitLab/Bitbucket

#### Environment Variables

Add all environment variables in the Vercel dashboard:

**Database:**

```bash
POSTGRES_URL="postgresql://username:password@hostname/database?sslmode=require"
```

**Clerk Authentication:**

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
CLERK_WEBHOOK_SECRET=whsec_...
```

**Polar Billing:**

```bash
POLAR_ACCESS_TOKEN=polar_at_...
POLAR_ENVIRONMENT=production
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_BUSINESS_PRODUCT_ID=prod_...
```

**Vercel Blob:**

```bash
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."
```

#### Post-Deployment Steps

1. **Update Clerk webhooks**: Change webhook URLs to use your production domain
2. **Update Polar webhooks**: Change webhook URLs to use your production domain
3. **Test billing flow**: Verify subscription creation and management works
4. **Test file uploads**: Verify profile image uploads work correctly
5. **Run database migrations**: Ensure your production database is up to date

#### Domain Configuration

1. Add your custom domain in Vercel project settings
2. Update Clerk allowed origins to include your custom domain
3. Update any hardcoded URLs in your application

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
