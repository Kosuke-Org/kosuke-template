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

Automatically captures unhandled exceptions, promise rejections, and React component errors caught by error boundaries.

### API Errors

Server-side errors in API routes are automatically captured and reported to Sentry with full context.

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

You can add custom context like user information, feature tags, subscription details, and breadcrumbs tracking user actions. This helps identify patterns and reproduce errors.

## Session Replay

### What It Records

- DOM changes
- User interactions (clicks, scrolls)
- Network requests
- Console logs
- Page navigations

### Sample Rates

Session replays are recorded for 10% of normal sessions and 100% of sessions with errors. This balances debugging capability with quota usage.

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

**Example Alert Rules:**

- Notify when error rate exceeds 5% for 5+ minutes in production
- Alert when new critical errors appear
- Notify on deployment failures or performance degradation

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

Breadcrumbs show the sequence of user actions leading to an error, making it easy to trace the root cause and reproduce issues.

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

Each deployment to Vercel automatically creates a release in Sentry, tracking which code version is running.

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

Error boundaries catch React component errors and automatically report them to Sentry. Both page-level and global error handlers are configured to capture and log all errors.

### Global Error Handler

The global error handler ensures that even critical errors that crash the entire application are captured and reported for debugging.

## Next Steps

Learn about deployment:

👉 **[Deployment Guide](../../deployment/full-deployment-guide)**
