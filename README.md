# Kosuke Template

[![GitHub Release](https://img.shields.io/github/v/release/Kosuke-Org/kosuke-template?style=flat-square&logo=github&color=blue)](https://github.com/Kosuke-Org/kosuke-template/releases)
[![License](https://img.shields.io/github/license/Kosuke-Org/kosuke-template?style=flat-square&color=green)](LICENSE)

A modern Next.js 15 template with TypeScript, Better Auth authentication with Organizations, Stripe Billing, DigitalOcean Spaces, PostgreSQL database, Shadcn UI, Tailwind CSS, and Sentry error monitoring. Built for multi-tenant SaaS applications.

Production-ready Next.js 15 SaaS starter with Better Auth Organizations, Stripe Billing, and complete multi-tenant functionality.

- **Next.js 15** with App Router
- **TypeScript** for type safety
- **Better Auth Authentication** for user management with **Organizations**
- **PostgreSQL** database with Drizzle ORM
- **Shadcn UI** components with Tailwind CSS
- **Stripe** billing integration with automated sync (personal & organization subscriptions)
- **BullMQ + Redis** for background jobs and scheduled tasks
- **Resend** email service with **React Email** templates
- **Profile image uploads** with DigitalOcean Spaces or S3-like storage
- **Multi-tenancy** with organization and team management
- **Sentry** error monitoring and performance tracking
- **Plausible Analytics** integration with configurable domains
- **Responsive design** with dark/light mode
- **Comprehensive testing** setup with Vitest

## 🛠 Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Auth**: Better Auth (with Organizations)
- **Database**: PostgreSQL (Neon) + Drizzle ORM
- **Queue**: BullMQ + Redis
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

| Service          | Purpose    | Sign Up                                          | Free Tier                          |
| ---------------- | ---------- | ------------------------------------------------ | ---------------------------------- |
| **Stripe**       | Billing    | [stripe.com](https://stripe.com)                 | Test mode                          |
| **Resend**       | Email      | [resend.com](https://resend.com)                 | 100 emails/day                     |
| **Sentry**       | Monitoring | [sentry.io](https://sentry.io)                   | 5k events/month                    |
| **DigitalOcean** | Storage    | [digitalocean.com](https://www.digitalocean.com) | $5/month (250GB + 1TB transfer) ❌ |

> **Note**: DigitalOcean Spaces is the only paid service. All other services have free tiers sufficient for development and testing.

### Local Development Setup

#### 1. Fork & Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/kosuke-template.git
cd kosuke-template
```

#### 2. Install Dependencies (Local)

```bash
nvm use & bun install --frozen-lockfile
```

**Note**: `nvm use` reads the Node version from `.nvmrc` and switches to it. Run `nvm install` first if the version isn't installed.

#### 3. Create Environment Variables

Create `.env` file in the root directory:

```bash
# Database (Local PostgreSQL via Docker)
POSTGRES_URL=postgres://postgres:postgres@localhost:54321/postgres

# Redis (via Docker on kosuke_network)
REDIS_URL=redis://redis:6379

# Engine (Python FastAPI microservice on kosuke_network)
ENGINE_URL=http://engine:8000

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

# Digital Ocean
S3_REGION=nyc3
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
```

**Get Your Credentials**:

- **Stripe**: Create account at [stripe.com](https://stripe.com) → Get API keys → Create products and prices
- **Resend**: Sign up → Create API key → Use `onboarding@resend.dev` for testing
- **Sentry**: Create project → Copy DSN (optional for local development)
- **DigitalOcean**: Create account → Create Spaces bucket → Generate API key & secret

#### 4. Start All Services

```bash
bun run dev
```

This builds and starts all services on the `kosuke_network`:

- **Next.js** on `http://localhost:3000`
- **PostgreSQL** on `localhost:54321`
- **Redis** on `localhost:6379`
- **Engine (FastAPI)** on `http://localhost:8000`
- **Background Workers** (BullMQ)

## 🐳 Docker Development

The template includes a complete Docker setup for local development with hot reload:

**Services**:

- **nextjs**: Next.js dev server with hot reload (port 3000)
- **workers**: BullMQ background workers with hot reload
- **postgres**: PostgreSQL database (port 54321)
- **redis**: Redis for caching & jobs (port 6379)
- **engine**: Python FastAPI microservice (port 8000)

**Common Commands**:

```bash
# Development Environment
bun run dev               # Start all Docker containers (Next.js, Postgres, Redis, Workers)

# Database Operations
bun run db:migrate        # Apply migrations
bun run db:seed           # Seed database
bun run db:generate       # Generate migrations (schema changes)
bun run db:push           # Push schema (prototyping)
bun run db:reset          # Reset database

# Testing & Quality
bun run test              # Run tests
bun run lint              # Run linter
bun run typecheck         # Run type check
bun run format            # Format code
bun run knip              # Check dependencies

# Email Templates
bun run email:dev         # Preview email templates (port 3001)

# Shadcn UI Management
bun run shadcn:update     # Update all shadcn components
bun run shadcn:check      # Check for available component updates
```

## ⚡ Background Jobs with BullMQ

This template includes a robust background job system powered by BullMQ and Redis:

- **🕐 Scheduled Jobs**: Automatically syncs subscription data from Stripe daily at midnight
- **♻️ Retry Logic**: Failed jobs automatically retry with exponential backoff
- **📊 Monitoring**: Jobs tracked via console logs and Sentry error reporting
- **⚙️ Scalable**: Add workers as needed to process jobs in parallel
- **🔧 Flexible**: Easy to add new background jobs and scheduled tasks

**Development**:

- Workers run in a separate container (`kosuke_template_workers`)
- Both web server and workers have hot reload enabled
- Changes to code automatically restart services
- View worker logs: `docker compose logs -f workers`

## 📧 Email Templates with React Email

This template uses **React Email** for building beautiful, responsive email templates with React components and TypeScript.

### Email Development Workflow

Services are already running via `docker compose up --build -d`. Open:

- **Next.js**: [localhost:3000](http://localhost:3000)
- **Email Preview**: [localhost:3001](http://localhost:3001) (via `bun run email:dev`)

To preview email templates in another terminal:

```bash
bun run email:dev
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
docker compose down -v && docker compose up -d && sleep 5 && docker exec kosuke_template_nextjs bun run db:migrate && docker exec kosuke_template_nextjs bun run db:seed

# Or just seed (without reset)
bun run db:seed
```

**Test Users Created:**

- `jane+kosuke_test@example.com` - Admin of "Jane Smith Co." (Free tier)
- `john+kosuke_test@example.com` - Admin of "John Doe Ltd." (Free tier), Member of "Jane Smith Co."

**Kosuke Verification Code:**

When signing in with test users in development, use verification code: `424242`

### Testing

Run tests locally (requires dependencies installed):

```bash
# All tests
bun run test

# Watch mode (auto-rerun on changes)
bun run test:watch

# With coverage report
bun run test:coverage
```

### Getting Help

- **GitHub Issues**: [github.com/Kosuke-Org/kosuke-template/issues](https://github.com/Kosuke-Org/kosuke-template/issues)
- **Discussions**: Use GitHub Discussions for questions

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.
