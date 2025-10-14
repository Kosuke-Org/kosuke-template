# Kosuke Template

Production-ready Next.js 15 SaaS starter with Clerk Organizations, Polar Billing, and complete multi-tenant functionality.

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
- **Billing**: Polar subscriptions
- **Email**: Resend + React Email
- **Storage**: Vercel Blob
- **Monitoring**: Sentry
- **UI**: Tailwind CSS + Shadcn UI

## 🤝 Contributing

We welcome contributions to improve Kosuke Template! This guide helps you set up your local development environment and submit pull requests.

### Prerequisites

Before contributing, ensure you have:

- **Node.js 20+**: [nodejs.org](https://nodejs.org)
- **pnpm**: `npm install -g pnpm`
- **Docker Desktop**: [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Git**: [git-scm.com](https://git-scm.com)

### Required Service Accounts

You'll need accounts with these services (all have free tiers):

| Service    | Purpose        | Sign Up                          | Free Tier       |
| ---------- | -------------- | -------------------------------- | --------------- |
| **Clerk**  | Authentication | [clerk.com](https://clerk.com)   | 10k MAUs        |
| **Polar**  | Billing        | [polar.sh](https://polar.sh)     | Sandbox mode    |
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
pnpm install
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

# Polar Billing (from sandbox.polar.sh)
POLAR_ENVIRONMENT=sandbox
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_ORGANIZATION_ID=your-org-slug
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_BUSINESS_PRODUCT_ID=prod_...
POLAR_WEBHOOK_SECRET=polar_webhook_...
POLAR_SUCCESS_URL=http://localhost:3000/billing/success?checkout_id={CHECKOUT_ID}

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
- **Polar**: Use [sandbox.polar.sh](https://sandbox.polar.sh) → Create org → Create products → Get API token
- **Resend**: Sign up → Create API key → Use `onboarding@resend.dev` for testing
- **Sentry**: Create project → Copy DSN (optional for local development)

#### 4. Start Database

```bash
docker-compose up -d
```

#### 5. Run Migrations

```bash
pnpm run db:migrate
```

#### 6. Start Development Server

```bash
pnpm run dev
```

Visit [localhost:3000](http://localhost:3000) 🚀

### Common Commands

```bash
# Development
pnpm run dev              # Start dev server (port 3000)
pnpm run build            # Build for production
pnpm run start            # Start production server

# Database
pnpm run db:generate      # Generate migration from schema changes
pnpm run db:migrate       # Run pending migrations
pnpm run db:studio        # Open Drizzle Studio (visual DB browser)
pnpm run db:seed          # Seed database with test data

# Email Development
pnpm run email:dev        # Preview email templates (port 3001)

# Code Quality
pnpm run lint             # Run ESLint
pnpm run typecheck        # Run TypeScript type checking
pnpm run format           # Format code with Prettier

# Testing
pnpm test                 # Run all tests
pnpm run test:watch       # Watch mode
pnpm run test:coverage    # Coverage report
```

### Database Operations

#### Making Schema Changes

```bash
# 1. Edit lib/db/schema.ts
# 2. Generate migration
pnpm run db:generate

# 3. Review generated SQL in lib/db/migrations/
# 4. Apply migration
pnpm run db:migrate
```

#### Visual Database Browser

```bash
pnpm run db:studio
# Visit https://local.drizzle.studio
```

### Email Template Development

```bash
# Start preview server
pnpm run email:dev

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
pnpm test

# Watch mode (auto-rerun on changes)
pnpm run test:watch

# With coverage report
pnpm run test:coverage
```

### Getting Help

- **Documentation**: [docs-template.kosuke.ai](https://docs-template.kosuke.ai)
- **GitHub Issues**: [github.com/filopedraz/kosuke-template/issues](https://github.com/filopedraz/kosuke-template/issues)
- **Discussions**: Use GitHub Discussions for questions

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.
