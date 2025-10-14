---
sidebar_position: 6
---

# Production Monitoring

Monitor your production Kosuke Template application with Sentry and service dashboards.

## Sentry Dashboard

### Error Monitoring

Access at [sentry.io](https://sentry.io):

**Issues Tab**:

- View all errors
- See error frequency
- Track error trends
- Assign to team members
- Mark as resolved

**Performance Tab**:

- Monitor page load times
- Track API response times
- Identify slow queries
- Optimize bottlenecks

### Alerts

Configure alerts for critical issues:

1. Go to **Alerts** in Sentry
2. Click **Create Alert**
3. Choose alert type:
   - New issues
   - High error rate
   - Performance degradation
4. Set notification method:
   - Email
   - Slack
   - PagerDuty

### Release Tracking

Monitor deployments:

- Track each Vercel deployment
- See errors by release
- Compare release health
- Identify problematic deployments

## Service Dashboards

### Vercel

Monitor at [vercel.com](https://vercel.com):

**Deployments**:

- Build status
- Deployment logs
- Preview deployments
- Production status

**Functions**:

- API route performance
- Cron job execution
- Error rates
- Invocation logs

**Analytics** (if enabled):

- Traffic statistics
- Web Vitals
- User engagement

### Clerk

Monitor at [dashboard.clerk.com](https://dashboard.clerk.com):

**Users**:

- Active user count
- Sign-up trends
- Authentication methods
- Session statistics

**Organizations**:

- Organization count
- Member activity
- Invitation status

**Webhooks**:

- Delivery status
- Failed webhooks
- Retry attempts
- Event history

### Polar

Monitor at [polar.sh/dashboard](https://polar.sh/dashboard):

**Subscriptions**:

- Active subscriptions
- Monthly recurring revenue (MRR)
- Churn rate
- Upgrade/downgrade trends

**Webhooks**:

- Event delivery
- Failed events
- Retry status

**Payments**:

- Payment success rate
- Failed payments
- Refund requests

### Neon

Monitor at [console.neon.tech](https://console.neon.tech):

**Compute**:

- CPU usage
- Memory usage
- Active connections

**Storage**:

- Database size
- Growth trends
- Branch usage

**Queries**:

- Query performance
- Slow queries
- Connection pool

## Key Metrics to Track

### Application Health

- Error rate (target: < 1%)
- API response time (target: < 500ms)
- Uptime (target: 99.9%)
- Page load time (target: < 3s)

### Business Metrics

- Monthly Active Users (MAU)
- Subscription conversion rate
- Churn rate
- Monthly Recurring Revenue (MRR)

### Performance

- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1
- Time to First Byte (TTFB): < 600ms

## Alerting Strategy

### Critical Alerts

Immediate notification:

- Site down (uptime monitoring)
- High error rate (> 5%)
- Database connection failures
- Payment processing errors

### Warning Alerts

Review within hours:

- Increased error rate (> 1%)
- Slow API responses (> 1s)
- High database usage
- Failed cron jobs

### Info Alerts

Review daily:

- Failed webhook deliveries
- Email bounce rate
- Storage usage warnings
- Dependency updates

## Logging

### Vercel Logs

Access real-time logs:

```bash
vercel logs --follow
```

Or view in dashboard: Deployments → [Deployment] → Logs

### Sentry Breadcrumbs

Track user actions before errors:

- Page navigations
- Button clicks
- API calls
- Database queries

### Custom Logging

Add custom logs for debugging:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.addBreadcrumb({
  category: 'billing',
  message: 'Subscription upgraded',
  level: 'info',
});
```

## Performance Monitoring

### Web Vitals

Monitor Core Web Vitals:

- Tracked automatically by Sentry
- View in Performance tab
- Filter by page/route
- Compare across releases

### API Performance

Track API routes:

- Response times
- Error rates
- Throughput
- Database query time

### Database Performance

Monitor with Neon:

- Query execution time
- Index usage
- Connection pool health
- Cache hit rate

## Uptime Monitoring

Consider adding:

- **UptimeRobot**: Free uptime monitoring
- **Pingdom**: Comprehensive monitoring
- **Better Uptime**: Modern uptime monitoring

## Dashboard Setup

### Weekly Review Dashboard

Create dashboard with:

- Error trends (last 7 days)
- New user signups
- Subscription changes
- Revenue metrics
- Performance trends

### Real-Time Dashboard

Monitor live:

- Current active users
- Error rate (last hour)
- API response times
- Deployment status

## Incident Response

### When Errors Spike

1. Check Sentry for error details
2. Review recent deployments
3. Check service status pages
4. Roll back if needed
5. Fix issue
6. Deploy fix
7. Verify resolution

### Communication

Keep users informed:

- Status page updates
- Email notifications
- In-app banners
- Social media updates

## Maintenance Windows

Schedule for:

- Database migrations
- Service updates
- Infrastructure changes

Best practices:

- Announce 24-48 hours ahead
- Choose low-traffic periods
- Have rollback plan
- Monitor during window

## Regular Reviews

### Daily

- Check error dashboard
- Review failed cron jobs
- Monitor webhook deliveries

### Weekly

- Review error trends
- Check performance metrics
- Review user feedback
- Update alerts if needed

### Monthly

- Review all metrics
- Update monitoring strategy
- Adjust alert thresholds
- Performance optimization

## Resources

- [Sentry Documentation](https://docs.sentry.io)
- [Vercel Monitoring](https://vercel.com/docs/observability)
- [Neon Monitoring](https://neon.tech/docs/introduction/monitoring)
