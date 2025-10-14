---
sidebar_position: 8
---

# Step 7: Configure Sentry Monitoring

Set up Sentry for error monitoring, performance tracking, and session replay to catch issues before your users report them.

## Why Sentry?

Sentry provides:

- Real-time error tracking
- Performance monitoring
- Session replay
- Release tracking
- Detailed error context
- Team collaboration features

## Step-by-Step Setup

### 1. Create Sentry Account

1. Go to [sentry.io](https://sentry.io)
2. Sign up using GitHub (recommended) or email
3. Complete the onboarding process

### 2. Create Project

1. Click **"Create Project"**
2. **Platform**: Select **"Next.js"**
3. **Project name**: Enter your project name (e.g., `your-project-name`)
4. **Team**: Select default team or create new one
5. Click **"Create Project"**

### 3. Get DSN

After project creation:

1. You'll see setup instructions with your DSN
2. DSN format: `https://[hash]@[region].ingest.sentry.io/[project-id]`
3. **Copy the DSN**

Alternatively, get it from:

1. **Settings → Projects**
2. Click your project
3. Go to **Client Keys (DSN)**
4. Copy the DSN URL

:::tip Save Your DSN

```
NEXT_PUBLIC_SENTRY_DSN=https://abc123@xyz.ingest.sentry.io/123456
```

:::

## What Gets Monitored

Kosuke Template automatically tracks:

### Error Monitoring

- **Client-side errors**: Browser exceptions, React errors
- **Server-side errors**: API errors, server exceptions
- **Edge errors**: Middleware, edge runtime errors

### Performance Monitoring

- **Page loads**: First Contentful Paint, Time to Interactive
- **API calls**: Response times, slow queries
- **Database queries**: Query performance
- **Custom transactions**: Track specific operations

### Session Replay

- **User sessions**: Video-like replay of user actions
- **Error context**: See exactly what user did before error
- **Network activity**: API calls, responses
- **Console logs**: Debug information

## Configuration

### Already Configured

The template includes Sentry configuration:

#### `instrumentation.ts`

```typescript
// Server-side monitoring
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
}
```

#### `instrumentation-client.ts`

```typescript
// Client-side monitoring
import './sentry.client.config';
```

#### `sentry.server.config.ts` & `sentry.client.config.ts`

Pre-configured with:

- Error tracking enabled
- Performance monitoring (10% sample rate)
- Session replay (10% sample rate)
- Source maps for debugging

### Adjust Sample Rates

Edit sample rates in config files:

```typescript
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% when error occurs
});
```

Higher rates = more data, more quota usage.

## Using Sentry

### Automatic Error Capture

Errors are captured automatically:

```typescript
// This error will be sent to Sentry automatically
throw new Error('Something went wrong');
```

### Manual Error Capture

Capture specific errors:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // Your code
} catch (error) {
  Sentry.captureException(error);
}
```

### Custom Context

Add context to errors:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.setUser({
  id: userId,
  email: user.email,
});

Sentry.setTag('feature', 'billing');

Sentry.captureException(error);
```

### Performance Tracking

Track custom transactions:

```typescript
import * as Sentry from '@sentry/nextjs';

const transaction = Sentry.startTransaction({
  name: 'Process Subscription',
  op: 'subscription',
});

// Your code

transaction.finish();
```

## Sentry Dashboard

### Key Features

#### Issues

- View all errors
- See error frequency
- Track error trends
- Assign to team members

#### Performance

- Monitor page load times
- Track API response times
- Identify slow queries
- Optimize bottlenecks

#### Releases

- Track deployments
- Monitor release health
- Identify problematic releases
- Roll back if needed

#### Alerts

- Configure alert rules
- Get notified of critical errors
- Set thresholds
- Integration with Slack, email, etc.

## Configure Alerts

Set up alerts for critical issues:

1. Go to **Alerts** in Sentry
2. Click **"Create Alert"**
3. Choose alert type:
   - **Issues**: Alert on new/recurring errors
   - **Metric**: Alert on performance metrics
4. Configure conditions:
   - Error rate exceeds threshold
   - New error type appears
   - Response time increases
5. Choose notification method:
   - Email
   - Slack
   - PagerDuty
   - Webhook

## Source Maps

### Automatic Upload

Sentry config includes automatic source map upload:

```javascript
// next.config.ts
module.exports = withSentryConfig(nextConfig, {
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
});
```

This enables:

- Readable stack traces
- Original source code in errors
- Better debugging experience

### Manual Upload

If automatic upload fails:

```bash
npx @sentry/cli sourcemaps upload --org your-org --project your-project .next
```

## Release Tracking

### Automatic Release Tracking

Sentry tracks releases automatically:

```bash
# Each deployment creates a new release
git commit -m "Fix: resolve billing issue"
git push
# → Vercel deploys → Sentry tracks release
```

### View Release Health

In Sentry dashboard:

1. Go to **Releases**
2. See crash-free users percentage
3. View new errors in release
4. Compare with previous releases

## Common Questions

### How much does Sentry cost?

Free tier includes:

- 5,000 errors/month
- 10,000 performance events/month
- 500 replays/month
- 1 GB attachments

Paid plans start at $26/month for more quota.

### Will Sentry slow down my app?

Minimal impact:

- Errors sent asynchronously
- Low sample rates (10%) for performance
- Efficient SDK

### Can I filter out certain errors?

Yes, configure in `sentry.*.config.ts`:

```typescript
Sentry.init({
  beforeSend(event) {
    // Filter out specific errors
    if (event.exception?.values?.[0]?.type === 'ChunkLoadError') {
      return null; // Don't send to Sentry
    }
    return event;
  },
});
```

### How long is data retained?

- **Free**: 30 days
- **Paid**: 90 days
- **Enterprise**: Custom retention

## Save Your Configuration

You now have your Sentry DSN:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://abc123@xyz.ingest.sentry.io/123456
```

## Next Steps

With monitoring configured, add environment variables:

👉 **[Step 8: Add Environment Variables](./08-environment-variables.md)**

---

**Having issues?** Check the [Troubleshooting](../reference/troubleshooting) guide or [Sentry docs](https://docs.sentry.io).
