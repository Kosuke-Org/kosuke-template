# Kosuke Template

A modern Next.js 15 template with TypeScript, Clerk authentication, Polar Billing, Vercel Blob, PostgreSQL database, Shadcn UI, Tailwind CSS, and Sentry error monitoring.

## 🚀 Features

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Clerk Authentication** for user management
- **PostgreSQL** database with Drizzle ORM
- **Shadcn UI** components with Tailwind CSS
- **Polar** billing integration
- **Resend** email service with welcome emails
- **Profile image uploads** with Vercel Blob
- **Sentry** error monitoring and performance tracking
- **Responsive design** with dark/light mode
- **Comprehensive testing** setup with Jest

## 🤖 Interactive Setup Guide (Recommended)

**For the easiest setup experience**, use our interactive CLI setup guide that walks you through everything step-by-step:

```bash
cd cli
virtualenv venv -p 3.12
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

The interactive setup guide will:

- ✅ Guide you through creating all necessary accounts
- ✅ Walk you through configuring each service
- ✅ Generate environment files automatically
- ✅ Save progress so you can resume anytime
- ✅ Set up production deployment on Vercel

📖 **For detailed setup instructions, deployment guides, and DevOps assistance**, see the [CLI Setup Guide](./cli/README.md).

## 🛠 Manual Setup (Alternative)

If you prefer to set up services manually or already have accounts configured:

### Quick Start

1. **Clone and setup:**

   ```bash
   git clone <your-forked-repo>
   cd your-project-name
   cp .env.example .env
   ```

2. **Database:**

   ```bash
   docker compose up -d
   npm run db:migrate
   ```

3. **Install and run:**
   ```bash
   npm install
   npm run dev
   ```

### Environment Variables

Create a `.env` file with these required variables:

```bash
# Database
POSTGRES_URL=postgres://postgres:postgres@localhost:54321/postgres

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Polar Billing
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_ENVIRONMENT=sandbox
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_BUSINESS_PRODUCT_ID=prod_...

# Sentry Error Monitoring
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn-here.ingest.sentry.io/project-id

# Resend Email Service
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=onboarding@yourdomain.com
RESEND_FROM_NAME=Your App Name
RESEND_REPLY_TO=support@yourdomain.com

# Vercel Blob
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

For detailed instructions on obtaining these keys and setting up each service, see the [CLI Setup Guide](./cli/README.md).

## 🧪 Testing

Run tests with:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## 🤖 Automated Shadcn/UI Updates

This template includes an automated system to keep your shadcn/ui components up-to-date:

- **🕐 Daily Checks**: Automatically checks for component updates every day at 2 AM UTC
- **📋 Smart PRs**: Creates pull requests only when updates are available
- **🛡️ Safe Updates**: Includes backups, change summaries, and review guidelines
- **🔧 Manual Control**: Run updates manually when needed

```bash
npm run shadcn:check    # Check for available updates
npm run shadcn:update   # Update components manually
npm run shadcn:force    # Force update all components
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

## 🚀 Deployment & Production

For complete deployment instructions, production configuration, and DevOps guidance, see the [CLI Setup Guide](./cli/README.md) which covers:

- 🤖 **Interactive Vercel deployment** with automated environment variable setup
- 🏦 **Production Polar billing** configuration
- 🔐 **Production Clerk authentication** setup
- ☁️ **Custom domain configuration**
- 🔒 **Security best practices**
- 📊 **Monitoring and maintenance**

The CLI guide provides step-by-step instructions for both development and production environments.

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.
