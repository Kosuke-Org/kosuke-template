---
sidebar_position: 10
---

# Step 9: Local Development Setup

Clone your repository and set up local development environment to start building your SaaS application.

## Prerequisites

Ensure you have installed:

- ✅ Node.js 20+
- ✅ pnpm
- ✅ Docker Desktop
- ✅ Git

See [Prerequisites](./prerequisites) if you haven't installed these yet.

## Clone Your Repository

### 1. Get Repository URL

Your repository URL from Step 1:

```
https://github.com/YOUR_USERNAME/YOUR_PROJECT_NAME.git
```

### 2. Clone Repository

```bash
# Clone your forked repository
git clone https://github.com/YOUR_USERNAME/YOUR_PROJECT_NAME.git

# Navigate to project directory
cd YOUR_PROJECT_NAME
```

## Set Up Environment Variables

### 1. Create .env File

Create a `.env` file in the root directory:

```bash
# Create environment file
touch .env
```

### 2. Add Local Configuration

Copy this template to your `.env` file:

```bash
# Database (Local PostgreSQL via Docker)
POSTGRES_URL=postgres://postgres:postgres@localhost:54321/postgres
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Clerk Authentication
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # From Clerk dashboard
CLERK_SECRET_KEY=sk_test_...                   # From Clerk dashboard
CLERK_WEBHOOK_SECRET=whsec_...                 # From Clerk webhook

# Polar Billing
POLAR_ENVIRONMENT=sandbox
POLAR_ACCESS_TOKEN=polar_oat_...               # From Polar dashboard
POLAR_SUCCESS_URL=http://localhost:3000/billing/success?checkout_id={CHECKOUT_ID}
POLAR_WEBHOOK_SECRET=polar_webhook_...         # From Polar webhook
POLAR_PRO_PRODUCT_ID=prod_...                  # From Polar products
POLAR_BUSINESS_PRODUCT_ID=prod_...             # From Polar products

# Sentry (Optional for local)
NEXT_PUBLIC_SENTRY_DSN=https://...             # From Sentry project

# Resend Email
RESEND_API_KEY=re_...                          # From Resend dashboard
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Your Project Name
# RESEND_REPLY_TO=support@yourdomain.com       # Optional

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Cron Security
CRON_SECRET=dev_cron_secret_change_in_production
```

:::tip Use Same Credentials
Use the same API keys from your production setup. Services like Clerk and Polar work in both environments.
:::

## Start Local Database

### 1. Start PostgreSQL

The project includes Docker Compose for local PostgreSQL:

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify it's running
docker-compose ps
```

This creates a PostgreSQL database on `localhost:54321`.

### 2. Run Migrations

Apply database schema:

```bash
pnpm run db:migrate
```

This creates all tables, indexes, and relationships.

### 3. Optional: Seed Database

Add sample data (if seed script exists):

```bash
pnpm run db:seed
```

## Install Dependencies

### Install npm Packages

```bash
# Install all dependencies
pnpm install
```

This installs:

- Next.js 15
- React 19
- Drizzle ORM
- Clerk SDK
- Polar SDK
- Shadcn UI components
- And all other dependencies

## Start Development Server

### 1. Run Development Server

```bash
pnpm run dev
```

This starts:

- Next.js dev server on `http://localhost:3000`
- Hot module replacement
- TypeScript type checking
- Fast refresh

### 2. Open in Browser

Visit [http://localhost:3000](http://localhost:3000)

You should see your application running!

### 3. Test Authentication

1. Click "Sign In"
2. Create a test account
3. Verify user is created in database
4. Test organization creation

## Development Workflow

### Common Commands

```bash
# Development
pnpm run dev              # Start dev server
pnpm run build            # Build for production
pnpm run start            # Start production server

# Database
pnpm run db:generate      # Generate migrations from schema changes
pnpm run db:migrate       # Run pending migrations
pnpm run db:push          # Push schema directly (dev only)
pnpm run db:studio        # Open Drizzle Studio
pnpm run db:seed          # Seed database

# Email Development
pnpm run email:dev        # React Email preview on port 3001
pnpm run dev:email        # Run dev + email preview together

# Code Quality
pnpm run lint             # Run ESLint
pnpm run typecheck        # Run TypeScript checks
pnpm run format           # Format with Prettier
pnpm test                 # Run Vitest tests

# Shadcn UI
pnpm run shadcn:check     # Check for component updates
pnpm run shadcn:update    # Update all components
```

### Development Tools

#### Drizzle Studio

Visual database manager:

```bash
pnpm run db:studio
```

Visit [https://local.drizzle.studio](https://local.drizzle.studio) to:

- Browse database tables
- Edit records
- Run queries
- View relationships

#### React Email Preview

Preview email templates:

```bash
pnpm run email:dev
```

Visit [http://localhost:3001](http://localhost:3001) to:

- View all email templates
- Test with different props
- Check responsiveness
- Copy HTML output

## Making Changes

### 1. Database Schema Changes

When modifying database schema:

```bash
# 1. Edit schema in lib/db/schema.ts
# 2. Generate migration
pnpm run db:generate

# 3. Apply migration
pnpm run db:migrate
```

### 2. Adding UI Components

Use Shadcn UI components:

```bash
# Add a new component
npx shadcn@latest add button

# Update all components
pnpm run shadcn:update
```

### 3. Code Quality Checks

Before committing:

```bash
# Run all checks
pnpm run lint
pnpm run typecheck
pnpm test
```

These run automatically in pre-commit hooks.

## Local Testing

### Test Authentication

1. Sign up with test email
2. Verify email (check Resend dashboard)
3. Create organization
4. Invite team member

### Test Billing

1. Upgrade to Pro plan
2. Use Polar sandbox checkout
3. Verify subscription in database
4. Test webhook events

### Test Email

1. Trigger welcome email
2. Check Resend dashboard for delivery
3. Preview email in React Email dev server

## Troubleshooting

### Port Already in Use

If port 3000 is in use:

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm run dev
```

### Database Connection Failed

Check Docker:

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### Module Not Found

Reinstall dependencies:

```bash
# Clear node_modules
rm -rf node_modules pnpm-lock.yaml

# Reinstall
pnpm install
```

### Build Errors

Check for:

- TypeScript errors: `pnpm run typecheck`
- Linting errors: `pnpm run lint`
- Missing environment variables

## Git Workflow

### Create Feature Branch

```bash
# Create and switch to new branch
git checkout -b feature/your-feature-name

# Make changes
# ...

# Commit changes
git add .
git commit -m "feat: add your feature"

# Push to GitHub
git push origin feature/your-feature-name
```

### Pull Request

1. Go to GitHub repository
2. Click "Compare & pull request"
3. Review changes
4. Create pull request
5. Vercel creates preview deployment automatically

## Next Steps

You're now set up for local development! 🎉

Explore the documentation:

- 📖 [Architecture](../architecture/tech-stack) - Understand how it all works
- ✨ [Features](../features/organizations) - Deep dive into features
- 💻 [Development](../development/local-setup) - Development best practices

Or start building:

- Customize the landing page
- Add your branding
- Build your first feature
- Deploy changes to production

---

**Having issues?** Check the [Troubleshooting](../reference/troubleshooting) guide or open an issue on GitHub.
