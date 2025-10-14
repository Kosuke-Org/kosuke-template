---
sidebar_position: 6
---

# Sentry Error Monitoring

Complete reference for Sentry error tracking and performance monitoring.

## Overview

Sentry provides error tracking, performance monitoring, and session replay for Kosuke Template.

## Dashboard

Access at [sentry.io](https://sentry.io)

## Configuration

### DSN

Found in **Settings → Projects → Client Keys (DSN)**:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://hash@region.ingest.sentry.io/project-id
```

### Sample Rates

Configured in `sentry.*.config.ts`:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% on errors
});
```

## Features

### Error Tracking

Automatically captures:

- Unhandled exceptions
- Promise rejections
- React errors
- API errors
- Server errors

### Performance Monitoring

Tracks:

- Page load times
- API response times
- Database queries
- Custom transactions
- Web Vitals

### Session Replay

Records:

- User interactions
- Console logs
- Network activity
- DOM changes
- Before-error context

## Using Sentry

### Automatic Error Capture

```typescript
// Errors captured automatically
throw new Error('Something went wrong');
```

### Manual Error Capture

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error);
}
```

### Custom Context

```typescript
Sentry.setUser({
  id: userId,
  email: user.email,
});

Sentry.setTag('feature', 'billing');

Sentry.addBreadcrumb({
  category: 'auth',
  message: 'User logged in',
  level: 'info',
});
```

### Performance Tracking

```typescript
const transaction = Sentry.startTransaction({
  name: 'Checkout Process',
  op: 'checkout',
});

// Your code

transaction.finish();
```

## Dashboard

### Issues Tab

View and manage errors:

- **All Issues**: Every unique error
- **For Review**: Unassigned errors
- **Assigned**: Errors assigned to team
- **Resolved**: Fixed errors

### Performance Tab

Monitor performance:

- **Transactions**: Page loads, API calls
- **Queries**: Database queries
- **Assets**: Static file loading
- **Web Vitals**: Core Web Vitals

### Releases Tab

Track deployments:

- Each Vercel deployment
- Errors by release
- Release health score
- Crash-free users

## Alerts

### Create Alert

1. Go to **Alerts**
2. Click **Create Alert**
3. Choose type:
   - **Issue Alert**: New or recurring errors
   - **Metric Alert**: Performance thresholds
4. Configure conditions
5. Set notification channel:
   - Email
   - Slack
   - PagerDuty
   - Webhook

### Alert Conditions

**Error rate**:

```
When error rate is above 5%
For at least 5 minutes
```

**Performance**:

```
When p95 response time is above 1000ms
For at least 10 minutes
```

## Source Maps

### Automatic Upload

Configured in `next.config.ts`:

```typescript
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
});
```

Benefits:

- Readable stack traces
- Original source code
- Better debugging

### Manual Upload

```bash
npx @sentry/cli sourcemaps upload \
  --org your-org \
  --project your-project \
  .next
```

## Performance Optimization

### Reduce Quota Usage

Adjust sample rates:

```typescript
// Sample 10% of transactions
tracesSampleRate: 0.1,

// Sample 10% of sessions
replaysSessionSampleRate: 0.1,

// Always capture errors
replaysOnErrorSampleRate: 1.0,
```

### Filter Events

```typescript
beforeSend(event) {
  // Ignore specific errors
  if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
    return null;
  }
  return event;
}
```

## Limits & Pricing

### Free Tier

- 5,000 errors/month
- 10,000 performance events/month
- 500 replays/month
- 30-day retention

### Team ($26/month)

- 50,000 errors/month
- 100,000 performance events/month
- 5,000 replays/month
- 90-day retention

### Business

Custom pricing:

- Unlimited events
- Custom retention
- Premium support
- SLA guarantees

## Integration

### Error Boundaries

```typescript
'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function Error({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <div>Something went wrong!</div>;
}
```

### API Error Handling

```typescript
export async function GET() {
  try {
    const data = await getData();
    return Response.json(data);
  } catch (error) {
    Sentry.captureException(error);
    return Response.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Best Practices

1. **Add context** to errors
2. **Set user context** when available
3. **Use breadcrumbs** for debugging
4. **Configure alerts** for critical errors
5. **Review issues regularly**
6. **Optimize sample rates** to manage quota
7. **Filter noise** (known issues, user errors)

## Resources

- [Sentry Documentation](https://docs.sentry.io)
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Best Practices](https://docs.sentry.io/product/best-practices/)
