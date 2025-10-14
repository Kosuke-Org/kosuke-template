---
sidebar_position: 1
---

# Vercel Deployment

Deploy your Kosuke Template application to Vercel for production.

## Automatic Deployment

After completing the [Deployment Guide](./full-deployment-guide), your app deploys automatically:

### On Every Push

```
git push → GitHub → Vercel → Build → Deploy
```

### Preview Deployments

Every pull request gets a preview URL:

```
Pull Request → Vercel Preview → Test → Merge → Production
```

## Build Configuration

The template is pre-configured for Vercel:

### package.json Scripts

```json
{
  "prebuild": "pnpm run db:migrate",
  "build": "next build",
  "start": "next start"
}
```

The `prebuild` script runs migrations automatically before each deployment.

## Database Migrations

Migrations run automatically via the `prebuild` script:

1. Pull latest code
2. Run `pnpm run db:migrate`
3. Build application
4. Deploy

### Migration Safety

- Migrations are idempotent
- Run only once per deployment
- Logged in build output

## Environment Variables

Required environment variables (add in Vercel dashboard):

```bash
# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
CLERK_WEBHOOK_SECRET

# Billing
POLAR_ACCESS_TOKEN
POLAR_ENVIRONMENT
POLAR_PRO_PRODUCT_ID
POLAR_BUSINESS_PRODUCT_ID
POLAR_WEBHOOK_SECRET

# Monitoring
NEXT_PUBLIC_SENTRY_DSN

# Email
RESEND_API_KEY
RESEND_FROM_EMAIL
RESEND_FROM_NAME

# App
NEXT_PUBLIC_APP_URL
CRON_SECRET
```

See [Environment Variables](../reference/environment-variables) for complete reference.

## Custom Domains

Add custom domains in Vercel dashboard:

1. Go to **Settings → Domains**
2. Click **Add Domain**
3. Enter your domain
4. Configure DNS records
5. Wait for verification

After adding custom domain, update:

- `NEXT_PUBLIC_APP_URL` in Vercel
- Webhook URLs in Clerk and Polar

## Deployment Status

Monitor deployments:

- **Deployments** tab in Vercel
- Build logs
- Runtime logs
- Performance metrics

## Troubleshooting

### Build Failures

Check build logs for:

- TypeScript errors
- Missing environment variables
- Migration failures

### Runtime Errors

Monitor with Sentry:

- Error tracking
- Performance monitoring
- Session replay

## Next Steps

Learn about database migrations and preview branches:

👉 **[Database Migrations](./database-migrations)**
