# Kosuke Template

[![GitHub Release](https://img.shields.io/github/v/release/filopedraz/kosuke-template?style=flat-square&logo=github&color=blue)](https://github.com/filopedraz/kosuke-template/releases)
[![License](https://img.shields.io/github/license/filopedraz/kosuke-template?style=flat-square&color=green)](LICENSE)
[![Documentation](https://img.shields.io/badge/docs-docs--template.kosuke.ai-blue?style=flat-square&logo=docusaurus)](https://docs-template.kosuke.ai)

A modern Next.js 15 template with TypeScript, Clerk authentication with Organizations, Stripe Billing, Vercel Blob, PostgreSQL database, Shadcn UI, Tailwind CSS, and Sentry error monitoring. Built for multi-tenant SaaS applications.

Production-ready Next.js 15 SaaS starter with Clerk Organizations, Stripe Billing, and complete multi-tenant functionality.

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Clerk Authentication** for user management with **Organizations**
- **PostgreSQL** database with Drizzle ORM
- **Shadcn UI** components with Tailwind CSS
- **Stripe** billing integration with automated sync (personal & organization subscriptions)
- **Vercel Cron Jobs** for subscription data synchronization
- **Resend** email service with **React Email** templates
- **Profile image uploads** with Vercel Blob
- **Multi-tenancy** with organization and team management
- **Sentry** error monitoring and performance tracking
- **Plausible Analytics** integration with configurable domains
- **Responsive design** with dark/light mode
- **Comprehensive testing** setup with Jest

## 📚 Documentation

**Complete setup guide, architecture, and features documentation:**

👉 **[docs-template.kosuke.ai](https://docs-template.kosuke.ai)**

## 🚀 Quick Links

- [Documentation Overview](https://docs-template.kosuke.ai/docs/) - Architecture, features, and services
- [Deployment Guide](https://docs-template.kosuke.ai/docs/deployment-guide) - Deploy to production in 60-90 minutes

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Auth**: Clerk (with Organizations)
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Billing**: Stripe subscriptions
- **Email**: Resend + React Email
- **Storage**: Vercel Blob
- **Monitoring**: Sentry
- **UI**: Tailwind CSS + Shadcn UI

## 🤝 Contributing

We welcome contributions to improve Kosuke Template! This guide helps you set up your local development environment and submit pull requests.

### Prerequisites

Before contributing, ensure you have:

- **Node.js 20+**: [nodejs.org](https://nodejs.org)
- **Bun**: [bun.sh](https://bun.sh) - `curl -fsSL https://bun.sh/install | bash`
- **Docker Desktop**: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Git**: [git-scm.com](https://git-scm.com)

### Required Service Accounts

You'll need accounts with these services (all have free tiers):

| Service    | Purpose        | Sign Up                          | Free Tier       |
| ---------- | -------------- | -------------------------------- | --------------- |
| **Clerk**  | Authentication | [clerk.com](https://clerk.com)   | 10k MAUs        |
| **Stripe** | Billing        | [stripe.com](https://stripe.com) | Test mode       |
| **Resend** | Email          | [resend.com](https://resend.com) | 100 emails/day  |
| **Sentry** | Monitoring     | [sentry.io](https://sentry.io)   | 5k events/month |

### Local Development Setup

#### 1. Fork & Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/kosuke-template.git
cd kosuke-template
```

#### 2. Install Dependencies

```bash
bun install
```

#### 3. Set Up Environment Variables

Create `.env` file in the root directory:

```bash
# Database (Local PostgreSQL via Docker)
POSTGRES_URL=postgres://postgres:postgres@localhost:54321/postgres
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Clerk Authentication (from dashboard.clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Stripe Billing
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRO_PRICE_ID=price_...      # $20/month
STRIPE_BUSINESS_PRICE_ID=price_... # $200/month
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_SUCCESS_URL=http://localhost:3000/billing/success
STRIPE_CANCEL_URL=http://localhost:3000/settings/billing

# Resend Email (from resend.com/api-keys)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Kosuke Template

# Sentry (from sentry.io - optional for local dev)
NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=dev_cron_secret
```

**Get Your Credentials**:

- **Clerk**: Create free app at [dashboard.clerk.com](https://dashboard.clerk.com) → Enable Organizations → Get API keys
- **Stripe**: Create account at [stripe.com](https://stripe.com) → Get API keys → Create products and prices
- **Resend**: Sign up → Create API key → Use `onboarding@resend.dev` for testing
- **Sentry**: Create project → Copy DSN (optional for local development)

#### 4. Start Database

```bash
docker-compose up -d
```

#### 5. Run Migrations

```bash
bun run db:migrate
```

## ⚡ Automated Subscription Sync

This template includes a robust subscription synchronization system powered by Vercel Cron Jobs:

- **🕐 Scheduled Sync**: Automatically syncs subscription data from Stripe every 6 hours
- **🔒 Secure Endpoint**: Protected by `CRON_SECRET` token authentication
- **🛡️ Webhook Backup**: Ensures data consistency even if webhooks are missed
- **📊 Monitoring**: Built-in health checks and comprehensive logging

The sync system runs automatically after deployment, requiring no manual intervention. Monitor sync activities through your Vercel Dashboard under the Functions tab.

## 📧 Email Templates with React Email

This template uses **React Email** for building beautiful, responsive email templates with React components and TypeScript.

### Email Development Workflow

#### 6. Start Development Server

```bash
bun run dev
```

Visit [localhost:3000](http://localhost:3000) 🚀

### Common Commands

```bash
# Development
bun run dev              # Start dev server (port 3000)
bun run build            # Build for production
bun run start            # Start production server

# Database
bun run db:generate      # Generate migration from schema changes
bun run db:migrate       # Run pending migrations
bun run db:studio        # Open Drizzle Studio (visual DB browser)
bun run db:seed          # Seed database with test data
bun run db:reset         # Reset database and seed it with test data

# Email Development
bun run email:dev        # Preview email templates (port 3001)

# Code Quality
bun run lint             # Run ESLint
bun run typecheck        # Run TypeScript type checking
bun run format           # Format code with Prettier

# Testing
bun test                # Run all tests
bun run test:watch       # Watch mode
bun run test:coverage    # Coverage report
```

### Database Operations

#### Making Schema Changes

```bash
# 1. Edit lib/db/schema.ts
# 2. Generate migration
bun run db:generate

# 3. Review generated SQL in lib/db/migrations/
# 4. Apply migration
bun run db:migrate
```

#### Seed with test data

Populate your local database with realistic test data:

```bash
# Reset database and seed with test data
bun run db:reset

# Or just seed (without reset)
bun run db:seed
```

**Test Users Created:**

- `jane+clerk_test@example.com` - Admin of "Jane Smith Co." (Free tier)
- `john+clerk_test@example.com` - Admin of "John Doe Ltd." (Free tier), Member of "Jane Smith Co."

**Clerk Verification Code:**

When signing in with test users in development, use verification code: `424242`

#### Visual Database Browser

```bash
bun run db:studio
# Visit https://local.drizzle.studio
```

### Email Template Development

```bash
# Start preview server
bun run email:dev

# Visit localhost:3001 to:
# - Preview all email templates
# - Test with different props
# - View HTML and plain text versions
# - Check responsive design
```

### Testing

#### Run Tests

```bash
# All tests
bun test

# Watch mode (auto-rerun on changes)
bun run test:watch

# With coverage report
bun run test:coverage
```

### Getting Help

- **Documentation**: [docs-template.kosuke.ai](https://docs-template.kosuke.ai)
- **GitHub Issues**: [github.com/filopedraz/kosuke-template/issues](https://github.com/filopedraz/kosuke-template/issues)
- **Discussions**: Use GitHub Discussions for questions

## 🚀 Releasing (Maintainers)

Creating a new release is simple:

```bash
# Create and push a tag
git tag -a v1.2.0 -m "Release version 1.2.0"
git push origin v1.2.0
```

GitHub Actions will automatically:

- Update all version files (package.json, pyproject.toml, .version)
- Build and push Docker images
- Create GitHub Release with changelog
- Generate documentation version snapshot

See [Contributing Guide](https://docs-template.kosuke.ai/docs/contributing) for full release process.

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.
