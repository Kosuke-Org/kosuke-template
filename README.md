# Kosuke Template

Production-ready Next.js 15 SaaS starter with Clerk Organizations, Polar Billing, and complete multi-tenant functionality.

## 📚 Documentation

**Complete setup guide, architecture, and features documentation:**

👉 **[docs-template.kosuke.ai](https://docs-template.kosuke.ai)**

## 🚀 Quick Links

- [Getting Started](https://docs-template.kosuke.ai/category/getting-started) - Complete setup guide
- [Architecture](https://docs-template.kosuke.ai/category/architecture) - Tech stack and structure
- [Features](https://docs-template.kosuke.ai/category/features) - Organizations, billing, email
- [Deployment](https://docs-template.kosuke.ai/category/deployment) - Deploy to production
- [Reference](https://docs-template.kosuke.ai/category/reference) - Commands and troubleshooting

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
# Start PostgreSQL container
docker-compose up -d postgres

# Verify it's running
docker-compose ps
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

#### Writing Tests

Tests are in `__tests__/` directory:

```typescript
// __tests__/hooks/use-auth.test.tsx
import { renderHook } from '@testing-library/react';
import { useAuth } from '@/hooks/use-auth';

describe('useAuth', () => {
  it('should return user data', async () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toBeDefined();
  });
});
```

### Code Style

#### Naming Conventions

```typescript
// Components: PascalCase
export function UserProfile() {}

// Functions: camelCase
export function getUserData() {}

// Constants: UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Types: PascalCase
interface UserProfile {}
type SubscriptionTier = 'free' | 'pro';
```

#### Import Order

```typescript
// 1. React
import { useState } from 'react';

// 2. External libraries
import { Button } from '@/components/ui/button';

// 3. Internal utilities
import { db } from '@/lib/db/drizzle';

// 4. Types
import type { User } from '@/lib/types';
```

### Pre-Commit Hooks

The project includes pre-commit hooks that automatically run:

- ESLint validation
- TypeScript type checking
- Prettier formatting
- Test suite

If any check fails, the commit is blocked. Fix the issues and try again.

### Pull Request Guidelines

1. **Update documentation** if you change APIs or add features
2. **Add tests** for new functionality (aim for >80% coverage)
3. **Ensure all checks pass** (lint, typecheck, tests)
4. **Write clear PR description**:
   - What changes were made
   - Why they were needed
   - How to test them
5. **Request review** from maintainers
6. **Address feedback** promptly
7. **Keep commits clean** (squash if requested)

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Maintenance tasks

**Examples**:

```bash
git commit -m "feat: add user profile export"
git commit -m "fix: resolve billing webhook timeout"
git commit -m "docs: update deployment guide"
```

### Troubleshooting

#### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 pnpm run dev
```

#### Database Connection Failed

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres

# Recreate container
docker-compose down
docker-compose up -d postgres
```

#### Module Not Found

```bash
# Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Clear Next.js cache
rm -rf .next
```

### Reporting Issues

When reporting bugs, include:

- **Clear description** of the problem
- **Steps to reproduce**
- **Expected vs actual behavior**
- **Environment details** (OS, Node version, pnpm version)
- **Error messages** or logs
- **Screenshots** if applicable

### Feature Requests

We welcome feature requests! Please:

- **Check existing issues** first to avoid duplicates
- **Describe the feature** clearly with use cases
- **Explain the value** it would provide
- **Consider implementation** complexity
- **Be open to discussion** and alternative approaches

### Getting Help

- **Documentation**: [docs-template.kosuke.ai](https://docs-template.kosuke.ai)
- **GitHub Issues**: [github.com/filopedraz/kosuke-template/issues](https://github.com/filopedraz/kosuke-template/issues)
- **Discussions**: Use GitHub Discussions for questions

## 📝 License

MIT License - see [LICENSE](./LICENSE) file for details.
