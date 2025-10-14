---
sidebar_position: 3
---

# Environment Variables Reference

Complete reference of all environment variables used in Kosuke Template.

## Database

```bash
# PostgreSQL connection string
POSTGRES_URL=postgresql://user:password@host:port/database?sslmode=require

# Local development
POSTGRES_URL=postgres://postgres:postgres@localhost:54321/postgres

# Docker Compose specific (optional)
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
```

## Clerk Authentication

```bash
# API Keys (from Clerk dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # or pk_live_...
CLERK_SECRET_KEY=sk_test_...                   # or sk_live_...
CLERK_WEBHOOK_SECRET=whsec_...

# URLs (use these exact values)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

## Polar Billing

```bash
# Environment (sandbox or production)
POLAR_ENVIRONMENT=sandbox

# API Access
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_ORGANIZATION_ID=your-org-slug

# Product IDs
POLAR_PRO_PRODUCT_ID=prod_...
POLAR_BUSINESS_PRODUCT_ID=prod_...

# Webhook
POLAR_WEBHOOK_SECRET=polar_webhook_...

# Success URL (local dev)
POLAR_SUCCESS_URL=http://localhost:3000/billing/success?checkout_id={CHECKOUT_ID}

# Success URL (production)
POLAR_SUCCESS_URL=https://yourdomain.com/billing/success?checkout_id={CHECKOUT_ID}
```

## Sentry Monitoring

```bash
# DSN from Sentry project
NEXT_PUBLIC_SENTRY_DSN=https://hash@region.ingest.sentry.io/project-id
```

## Resend Email

```bash
# API Key
RESEND_API_KEY=re_...

# Sender Configuration
RESEND_FROM_EMAIL=onboarding@resend.dev  # or your verified domain
RESEND_FROM_NAME=Your App Name

# Optional Reply-To
RESEND_REPLY_TO=support@yourdomain.com
```

## Vercel Blob

```bash
# Automatically added by Vercel when you create Blob storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

:::tip Automatic Configuration
Vercel manages the Blob token automatically. Don't set this manually.
:::

## Application Configuration

```bash
# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000      # Local
NEXT_PUBLIC_APP_URL=https://yourdomain.com     # Production

# Node Environment
NODE_ENV=development  # Local
NODE_ENV=production   # Production (auto-set by Vercel)
```

## Cron Job Security

```bash
# Secure token for cron endpoints
CRON_SECRET=generate_random_secure_token

# Generate with:
# openssl rand -base64 32
```

## Variable Types

### Public (NEXT*PUBLIC*\*)

Included in client bundle:

- Visible in browser
- Used for client-side features
- Examples: Clerk publishable key, Sentry DSN

### Private (no prefix)

Server-side only:

- Never exposed to browser
- Used for sensitive operations
- Examples: API secrets, webhook secrets

## Environment Files

### .env (Local Development)

```bash
# Local development with Docker Compose
POSTGRES_URL=postgres://postgres:postgres@localhost:54321/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
# ... other local variables
```

### Vercel (Production)

All variables set in:

- Vercel Dashboard → Settings → Environment Variables
- Select: Production, Preview, Development

## Required vs Optional

### Required for Basic Functionality

```bash
POSTGRES_URL                          # Database
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY    # Auth
CLERK_SECRET_KEY                      # Auth
CLERK_WEBHOOK_SECRET                  # Auth sync
NEXT_PUBLIC_APP_URL                   # URLs
```

### Required for Full Features

```bash
POLAR_ACCESS_TOKEN                    # Billing
POLAR_PRO_PRODUCT_ID                  # Products
POLAR_BUSINESS_PRODUCT_ID             # Products
POLAR_WEBHOOK_SECRET                  # Billing sync
RESEND_API_KEY                        # Email
NEXT_PUBLIC_SENTRY_DSN               # Monitoring
CRON_SECRET                           # Cron jobs
```

### Optional

```bash
RESEND_REPLY_TO                       # Email reply-to
NEXT_PUBLIC_PLAUSIBLE_DOMAIN         # Analytics
NEXT_PUBLIC_PLAUSIBLE_HOST           # Analytics
```

## Validation

Validate required variables at build time:

```typescript
// Already implemented in the template
const requiredEnvVars = ['POSTGRES_URL', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY'];

for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
}
```

## Troubleshooting

### Variable Not Loading

1. Check variable name (exact match, case-sensitive)
2. Restart dev server after adding variables
3. Rebuild for production
4. Check Vercel environment selection

### Public Variable Not Accessible

Ensure variable starts with `NEXT_PUBLIC_`:

```bash
# ✅ Accessible in browser
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...

# ❌ Server-side only
CLERK_PUBLISHABLE_KEY=pk_test_...
```

### Private Variable Exposed

Never use private variables in client components:

```typescript
// ❌ Bad: Exposes secret
'use client';
const secret = process.env.CLERK_SECRET_KEY;

// ✅ Good: Use in Server Component or API route
const secret = process.env.CLERK_SECRET_KEY;
```

## Best Practices

1. **Never commit .env files** (already in .gitignore)
2. **Use .env.example** to document required variables
3. **Validate on startup** to catch missing variables early
4. **Different values per environment** (dev/staging/prod)
5. **Rotate secrets regularly** (especially after team changes)
6. **Document variables** in this file and .env.example
7. **Use strong secrets** (minimum 32 characters for tokens)

## Next Steps

Review all available commands:

👉 **[Commands Reference](./commands)**
