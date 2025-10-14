---
sidebar_position: 6
---

# Error Monitoring

Comprehensive error tracking and monitoring with Sentry.

## Overview

Sentry automatically monitors:

- Client-side errors
- Server-side errors
- API errors
- Performance issues
- User sessions

## What Gets Tracked

### JavaScript Errors

```typescript
// Unhandled exceptions
throw new Error('Something went wrong');

// Promise rejections
Promise.reject('Failed');

// React component errors
// Caught by error boundaries
```

### API Errors

```typescript
// Server errors
export async function GET() {
  throw new Error('Database error');
  // Automatically captured
}
```

### Performance Issues

- Slow page loads (> 3s)
- Slow API responses (> 1s)
- Database query times
- Large bundle sizes

## Error Context

### Automatic Context

Sentry captures:

- User information (if authenticated)
- Browser/device details
- URL and route
- Timestamp
- Environment (dev/prod)
- Release version

### Custom Context

Add your own context:

```typescript
import * as Sentry from '@sentry/nextjs';

// Set user context
Sentry.setUser({
  id: userId,
  email: user.email,
  username: user.username,
});

// Add tags
Sentry.setTag('feature', 'billing');
Sentry.setTag('organization', orgId);

// Add custom context
Sentry.setContext('subscription', {
  tier: 'pro',
  status: 'active',
});

// Add breadcrumbs (user actions)
Sentry.addBreadcrumb({
  category: 'navigation',
  message: 'User navigated to billing',
  level: 'info',
});
```

## Session Replay

### What It Records

- DOM changes
- User interactions (clicks, scrolls)
- Network requests
- Console logs
- Page navigations

### Sample Rates

Configured in Sentry config:

```typescript
// 10% of normal sessions
replaysSessionSampleRate: 0.1,

// 100% of sessions with errors
replaysOnErrorSampleRate: 1.0,
```

### Privacy

Sensitive data is masked:

- Password fields
- Credit card inputs
- Personal information

## Error Alerts

### Configure Alerts

1. Go to Sentry dashboard
2. Click **Alerts**
3. Create alert rule:

**Example: High Error Rate**

```
Alert when:
  Error rate is above 5%
  For at least 5 minutes
  In production environment

Notify via:
  Email to team@example.com
```

**Example: New Error Type**

```
Alert when:
  A new issue is created
  In production
  With level: error or fatal

Notify via:
  Slack #alerts channel
```

### Alert Channels

- Email
- Slack
- PagerDuty
- Discord
- Webhook

## Debugging Errors

### Using Sentry Dashboard

1. **Issues** tab shows all errors
2. Click error to see details:
   - Stack trace
   - User context
   - Breadcrumbs (what user did)
   - Session replay (if available)
   - Environment details

### Source Maps

Sentry automatically uploads source maps:

- See original TypeScript code
- Readable stack traces
- Exact line numbers
- Function names preserved

### Finding Root Cause

Use breadcrumbs to trace:

```
1. User loaded page →
2. Clicked "Upgrade" button →
3. API call to /api/billing →
4. Error: "Product ID not found"
```

## Performance Monitoring

### Transactions

Sentry tracks:

- Page loads
- API calls
- Database queries
- Custom operations

### Metrics

View performance metrics:

- Average response time
- P50, P75, P95, P99 percentiles
- Throughput
- Error rate

### Optimization

Identify bottlenecks:

1. Sort transactions by slowest
2. View transaction details
3. See database queries
4. Optimize slow operations

## Release Tracking

### Automatic Releases

Each deployment creates a release:

```
git push → Vercel deploy → Sentry release created
```

### Release Health

View in Sentry:

- Crash-free users percentage
- New errors in release
- Performance comparison
- Adoption rate

### Rollback

If release has issues:

1. Identify problematic deployment
2. Rollback in Vercel
3. Deploy fix
4. Monitor new release

## Error Budget

### Set Error Budget

Define acceptable error rates:

- **Target**: < 1% error rate
- **Warning**: 1-5% error rate
- **Critical**: > 5% error rate

### Monitor Budget

Track daily/weekly:

- Are we within budget?
- Trending up or down?
- Which features cause errors?

## Best Practices

1. **Add context** to all errors
2. **Set user context** when authenticated
3. **Use breadcrumbs** for user flow
4. **Configure alerts** for critical errors
5. **Review errors daily**
6. **Fix errors by priority**
7. **Monitor performance** regularly

## Integration Points

### Error Boundaries

```typescript
// app/error.tsx
'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function Error({ error }: { error: Error }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <div>Something went wrong!</div>;
}
```

### Global Error Handler

```typescript
// app/global-error.tsx
'use client';

import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error }: { error: Error }) {
  Sentry.captureException(error);
  return <html><body>Global error occurred</body></html>;
}
```

## Resources

- [Sentry Dashboard](https://sentry.io)
- [Sentry Docs](https://docs.sentry.io)
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
