---
sidebar_position: 4
---

# Vercel Platform

Complete reference for Vercel deployment and features.

## Overview

Vercel hosts your Kosuke Template application with automatic deployments, edge network, and integrated services.

## Dashboard

Access at [vercel.com](https://vercel.com)

## Project Structure

### Deployments

Every git push creates deployment:

- **Production**: Main branch
- **Preview**: Pull requests and other branches

### Functions

Serverless functions:

- API routes
- Server Components
- Middleware
- Cron jobs

### Storage

Integrated storage:

- **Blob**: File storage
- **KV**: Key-value database (optional)
- **Postgres**: Via Neon integration

## Configuration

### Environment Variables

Set in **Settings → Environment Variables**:

**Environments**:

- Production
- Preview
- Development

**Variable Types**:

- `NEXT_PUBLIC_*`: Client-side
- Regular: Server-side only

### Build Settings

Configure in **Settings → General**:

```bash
# Build command
pnpm run build

# Output directory
.next

# Install command
pnpm install

# Development command
pnpm run dev
```

### Functions

Configure in **Settings → Functions**:

**Region**: Auto (recommended)
**Timeout**: 10s (Hobby), 60s (Pro)
**Memory**: 1024 MB (default)

## Deployments

### Automatic Deployments

```
git push → GitHub → Vercel → Build → Deploy
```

### Manual Deployments

1. Click **Deployments** tab
2. Click **⋯** on deployment
3. Click **Redeploy**

### Deployment Status

- 🔨 **Building**: Compiling application
- ✅ **Ready**: Successfully deployed
- ❌ **Failed**: Build error
- 🔄 **Queued**: Waiting to build

## Domains

### Default Domain

Every project gets:

```
https://project-name.vercel.app
```

### Custom Domains

Add in **Settings → Domains**:

1. Click **Add Domain**
2. Enter domain
3. Configure DNS
4. Wait for verification

### SSL Certificates

Automatic:

- Free SSL via Let's Encrypt
- Auto-renewal
- HTTPS redirect

## Blob Storage

### Setup

Created via **Storage** tab:

1. Select **Blob**
2. Name store
3. Vercel adds `BLOB_READ_WRITE_TOKEN`

### Usage

```typescript
import { put } from '@vercel/blob';

const blob = await put('file.jpg', file, {
  access: 'public',
});

// blob.url: CDN URL
```

## Cron Jobs

### Configuration

Defined in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-subscriptions",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

### Monitoring

View cron execution:

1. **Functions** tab
2. Filter by cron
3. View logs

## Logs

### Real-Time Logs

```bash
vercel logs --follow
```

### Dashboard Logs

1. **Deployments** → Select deployment
2. View **Runtime Logs**
3. Filter by:
   - Function
   - Severity
   - Time range

## Analytics

### Web Vitals

Built-in metrics:

- Largest Contentful Paint
- First Input Delay
- Cumulative Layout Shift

### Speed Insights

Enable in **Analytics** tab:

- Real user metrics
- Performance scores
- Page-by-page analysis

## Integrations

### Neon Integration

Automatic:

- Database provisioning
- Environment variables
- Preview branches

### GitHub Integration

Automatic:

- Deploy on push
- Preview deployments
- Deployment status in PRs

## Limits & Pricing

### Hobby (Free)

- Unlimited deployments
- 100 GB bandwidth/month
- 100 GB-hours compute
- Community support

### Pro ($20/month)

- Unlimited bandwidth
- Unlimited compute
- Team collaboration
- Advanced analytics
- Priority support

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/nextjs)
- [Platform Limits](https://vercel.com/docs/limits)
