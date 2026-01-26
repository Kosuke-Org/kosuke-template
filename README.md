# Kosuke Template

[![GitHub Release](https://img.shields.io/github/v/release/Kosuke-Org/kosuke-template?style=flat-square&logo=github&color=blue)](https://github.com/Kosuke-Org/kosuke-template/releases)
[![License](https://img.shields.io/github/license/Kosuke-Org/kosuke-template?style=flat-square&color=green)](LICENSE)

A modern Next.js 16 template with TypeScript, Better Auth authentication with Organizations, Stripe Billing, DigitalOcean Spaces, PostgreSQL database, Shadcn UI, Tailwind CSS, and Sentry error monitoring. Built for multi-tenant SaaS applications.

Production-ready Next.js 16 SaaS starter with Better Auth Organizations, Stripe Billing, and complete multi-tenant functionality.

- **Next.js 16** with App Router
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

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
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

# Stripe Billing
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
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

# Config Encryption (generate with: openssl rand -base64 32)
ENCRYPTION_KEY=your_32+_character_random_string_here

# Digital Ocean
S3_REGION=nyc3
S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
S3_BUCKET=your-bucket-name
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key
```

**Get Your Credentials**:

- **Config Encryption Key**: Generate with `openssl rand -base64 32` (required for encrypted config storage)
- **Stripe**: Create account at [stripe.com](https://stripe.com) → Get API keys → Create products and prices
- **Resend**: Sign up → Create API key → Use `onboarding@resend.dev` for testing
- **Sentry**: Create project → Copy DSN (optional for local development)
- **DigitalOcean**: Create account → Create Spaces bucket → Generate API key & secret

#### 4. Start All Services

```bash
docker compose up --build -d
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

**Common Commands**:

```bash
# Development Environment
bun run dev               # Start dev server

# Database Operations
bun run db:migrate        # Apply migrations
bun run db:seed           # Seed database
bun run db:generate       # Generate migrations (schema changes)
bun run db:push           # Push schema (prototyping)
bun run db:reset          # Reset database

# Stripe Operations
bun run stripe:seed       # Create/sync products & prices in Stripe using lookup keys

# Testing & Quality
bun run test              # Run tests
bun run test:watch        # Run tests in watch mode
bun run test:coverage     # Generate test coverage report
bun run lint              # Run linter
bun run typecheck         # Run type check
bun run format            # Format code
bun run format:check      # Check code formatting
bun run knip              # Declutter project

# Email Templates
bun run email:dev         # Preview email templates (port 3001)

# Shadcn UI Management
bun run shadcn:update     # Update all shadcn components
bun run shadcn:check      # Check for available component updates
```

## 💳 Stripe Integration

The template uses a dynamic Stripe integration where products and pricing are managed via JSON configuration and synced to Stripe using lookup keys.

### How It Works

1. **Products Configuration**: All tiers (free, pro, business) are defined in `lib/billing/products.json`
2. **Tier Hierarchy**: Each product has an explicit `tierLevel` field (0, 1, 2, etc.) that defines feature access permissions
3. **Stripe Sync**: Run `bun run stripe:seed` to create/update products in Stripe
4. **Lookup Keys**: Products are fetched dynamically using lookup keys (e.g., `free_monthly`, `pro_monthly`)
5. **Dynamic Pricing**: The billing page fetches pricing directly from Stripe via tRPC

### Setup Steps

1. **Configure Products** (optional - defaults are provided):
   - Edit `lib/billing/products.json` to customize pricing, features, and descriptions
   - Set billing intervals, currency, and other Stripe-specific options
   - Assign `tierLevel` values to define the feature access hierarchy (0 = lowest tier)

2. **Sync to Stripe**:

   ```bash
   bun run stripe:seed
   ```

   This script is idempotent - safe to run multiple times. It will:
   - Create products and prices in Stripe
   - Create/update webhook endpoint for billing events
   - Store webhook secret in database (encrypted)
   - Use lookup keys to prevent duplicates
   - Output product and price IDs

3. **No Manual Price IDs**: Unlike traditional Stripe setups, you don't need to manually copy price IDs to environment variables. Prices are fetched dynamically using lookup keys.

### Benefits

- **Single Source of Truth**: Products defined once in JSON
- **Explicit Tier Hierarchy**: `tierLevel` field makes access levels clear and self-documenting
- **Flexible Billing Intervals**: Multiple products can share the same tier level (e.g., `pro_monthly` and `pro_yearly` both at level 1)
- **Easy Updates**: Change pricing by editing JSON and re-running sync script
- **Migration-Friendly**: All users (including free tier) have Stripe subscriptions
- **No Hardcoded Values**: Pricing fetched dynamically from Stripe

### Adding New Tiers

1. Add a new tier to `lib/billing/products.json` with an appropriate `tierLevel`
2. Update the `SubscriptionTier` constants in `lib/billing/products.ts`
3. Run `bun run stripe:seed` to create it in Stripe
4. The new tier automatically appears in the billing UI with correct feature access

Example:

```json
{
  "lookupKey": "enterprise_monthly",
  "tierLevel": 3,
  "product": {
    "name": "Enterprise",
    "description": "For large organizations"
  },
  "price": {
    "unit_amount": 99900,
    "currency": "usd",
    "recurring": { "interval": "month", "interval_count": 1 }
  },
  "features": ["All features", "Priority support", "Custom integrations"]
}
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

Services are already running via `bun run dev`. Open:

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

## 🏛️ AI-Driven Development Scripts (Panos)

<p align="center">
  <img src="https://picsum.photos/seed/panos-greek-god/300/200" alt="Panos - Our AI Overlord (artist's impression)" />
  <br/>
  <em>Panos contemplating your codebase (artist's depiction, may not be accurate)</em>
</p>

Meet **Panos** — named after the Greek god Pan, protector of shepherds and flocks. Except instead of sheep, he herds your code from idea to production. He's basically Pan, but for developers who are too lazy to write their own tickets.

### Prerequisites

- **Claude Code CLI** must be authenticated (`claude` command available)
- **Docker** must be running (Panos spins up his own PostgreSQL container)

### Available Scripts

| Script | Purpose | What It Does |
|--------|---------|--------------|
| `panos.sh` | Full AI workflow | Requirements → Map → Tickets → Build → Commit |
| `requirements.sh` | Requirements only | Interactive product requirements gathering |
| `test.sh` | Browser testing | AI-powered web testing via Chrome integration |

### Quick Usage

```bash
# Full Panos workflow (the whole enchilada)
./scripts/panos.sh

# Just gather requirements (when you only need the docs.md)
./scripts/requirements.sh

# Run AI browser tests (requires Chrome + Claude extension)
./scripts/test.sh --url=http://localhost:3000
```

### Panos Workflow Steps

1. **REQUIREMENTS** — Describe your product idea, Panos asks clarifying questions, generates `.kosuke/docs.md`
2. **MAP** — Analyzes codebase and requirements, generates `.kosuke/map.json` with routes/endpoints
3. **TICKETS** — Creates implementation tickets in `.kosuke/tickets.json`
4. **BUILD** — Implements each ticket: ship → migrate (if schema) → review → commit
5. **COMMIT** — Final commit with all changes

### Options

```bash
./scripts/panos.sh --directory=/path/to/project  # Run in specific directory
./scripts/panos.sh --interactive                  # Enable confirmation prompts
./scripts/panos.sh --no-commit                    # Skip all commits
./scripts/test.sh --record                        # Record test session as GIF
```

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.
