---
sidebar_position: 1
---

# Local Setup

Set up your local development environment for Kosuke Template.

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/YOUR_USERNAME/YOUR_PROJECT.git
cd YOUR_PROJECT

# 2. Install dependencies
pnpm install

# 3. Copy environment variables
cp .env.example .env
# Edit .env with your credentials

# 4. Start database
docker-compose up -d postgres

# 5. Run migrations
pnpm run db:migrate

# 6. Start development server
pnpm run dev
```

Visit [localhost:3000](http://localhost:3000)

## Environment Setup

Create `.env` file with:

```bash
# Database
POSTGRES_URL=postgres://postgres:postgres@localhost:54321/postgres

# Clerk (from dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Polar (from dashboard)
POLAR_ENVIRONMENT=sandbox
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_BUSINESS_PRODUCT_ID=prod_...

# Resend
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Your App

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=dev_secret
```

## Development Workflow

### Daily Development

```bash
# 1. Pull latest changes
git pull

# 2. Install dependencies (if package.json changed)
pnpm install

# 3. Run migrations (if schema changed)
pnpm run db:migrate

# 4. Start dev server
pnpm run dev
```

### Making Changes

```bash
# 1. Create feature branch
git checkout -b feature/your-feature

# 2. Make changes
# ...

# 3. Run checks
pnpm run lint
pnpm run typecheck
pnpm test

# 4. Commit
git add .
git commit -m "feat: your feature"

# 5. Push
git push origin feature/your-feature
```

## Database Management

### Drizzle Studio

Visual database browser:

```bash
pnpm run db:studio
```

Visit [https://local.drizzle.studio](https://local.drizzle.studio)

### Making Schema Changes

```bash
# 1. Edit lib/db/schema.ts
# 2. Generate migration
pnpm run db:generate

# 3. Apply migration
pnpm run db:migrate
```

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm run test:watch

# Coverage
pnpm run test:coverage
```

## Email Development

Preview email templates:

```bash
pnpm run email:dev
```

Visit [localhost:3001](http://localhost:3001)

## Debugging

### VS Code Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js: debug server-side",
      "type": "node-terminal",
      "request": "launch",
      "command": "pnpm run dev"
    }
  ]
}
```

### Chrome DevTools

1. Run `pnpm run dev`
2. Open Chrome DevTools
3. Click Node.js icon
4. Debug server-side code

## Next Steps

Learn about testing:

👉 **[Testing Guide](./testing)**
