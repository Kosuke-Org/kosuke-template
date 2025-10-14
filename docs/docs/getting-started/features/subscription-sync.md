---
sidebar_position: 4
---

# Subscription Synchronization

Automated subscription data synchronization using webhooks and cron jobs.

## Dual Sync System

Kosuke Template uses two methods to keep subscription data in sync:

### 1. Real-Time Webhooks

Immediate updates when events occur in Polar. When a subscription is created, updated, or canceled, Polar sends a webhook notification that instantly updates the database and user access.

**Benefits**:

- Instant updates
- No delay in access changes
- Real-time billing status

**Handled Events**:

- `subscription.created`: New subscription
- `subscription.updated`: Plan changes, payment updates
- `subscription.canceled`: Subscription ends

### 2. Scheduled Cron Jobs

Backup synchronization every 6 hours at 00:00, 06:00, 12:00, and 18:00 UTC. The cron job fetches all subscriptions from Polar's API and ensures the database matches.

**Benefits**:

- Ensures consistency
- Recovers from missed webhooks
- Catches edge cases
- Validates data integrity

**Schedule**: Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)

## Why Both?

### Webhooks Can Fail

Reasons webhooks might fail:

- Temporary network issues
- Server downtime during deployment
- Webhook endpoint temporarily unavailable
- Rate limiting

### Cron Provides Backup

The cron job:

- Fetches all subscriptions from Polar
- Compares with database
- Updates any discrepancies
- Logs sync results

## Implementation

### Webhook Handler

The webhook handler at `/api/billing/webhook` receives events from Polar, verifies the signature for security, and updates the database accordingly. It handles subscription creation, updates, and cancellations.

### Cron Handler

The cron handler at `/api/cron/sync-subscriptions` runs on a schedule, fetches all subscriptions from Polar's API, and synchronizes them with the database. It's protected with a secure token to prevent unauthorized access.

### Cron Configuration

The cron job is configured in `vercel.json` to run every 6 hours using a standard cron expression. Vercel's infrastructure handles the scheduling automatically.

## Security

### Webhook Verification

All webhook requests are verified using Polar's signing secret. Invalid signatures are rejected to prevent malicious requests from modifying subscription data.

### Cron Authentication

Cron endpoints require a secure bearer token to prevent unauthorized access. This token is stored as an environment variable and must match for the sync to execute.

## Monitoring

### Webhook Monitoring

Check webhook delivery in Polar dashboard:

- **Webhooks** tab
- View delivery status
- See retry attempts
- Debug failed webhooks

### Cron Monitoring

Monitor cron execution in Vercel:

1. **Functions** tab
2. Filter by cron path
3. View execution logs
4. Check for errors

### Sync Logs

Logs include:

- Subscriptions synced
- Errors encountered
- Sync duration
- Timestamp

## Data Consistency

### Subscription States

The database tracks subscription states including active, canceled, incomplete (payment failed), and past_due (payment retry in progress). These states determine user access to features.

### Handling Conflicts

If webhook and cron data differ:

1. Polar is source of truth
2. Cron overwrites database
3. User sees updated status
4. Logged for review

## Testing

### Test Webhook

1. Create test subscription in Polar sandbox
2. Check webhook logs in Polar
3. Verify database updated
4. Check application access

### Test Cron

The cron endpoint can be triggered manually for testing purposes using the authorization token. It can also be triggered from the Vercel dashboard for immediate synchronization.

### Verify Sync

Database records can be viewed using Drizzle Studio and compared with Polar's dashboard to ensure all subscriptions match perfectly.

## Troubleshooting

### Webhooks Not Received

1. Check webhook URL in Polar
2. Verify webhook secret matches
3. Check Vercel function logs
4. Test webhook endpoint manually

### Cron Not Running

1. Verify cron configuration in `vercel.json`
2. Check `CRON_SECRET` is set
3. View cron logs in Vercel Functions tab
4. Ensure endpoint returns 200 status

### Data Out of Sync

1. Check webhook delivery status
2. Review cron logs for errors
3. Manually trigger cron sync
4. Verify Polar API access

## Best Practices

1. **Monitor both systems**: Check webhook and cron logs regularly
2. **Handle failures gracefully**: Log errors, don't block user operations
3. **Keep secrets secure**: Rotate cron secret, verify webhook signatures
4. **Test thoroughly**: Verify sync works in all scenarios
5. **Log everything**: Track sync operations for debugging

## Performance

### Webhook Performance

- Response time: < 500ms
- No blocking operations
- Async database updates
- Queued if needed

### Cron Performance

- Typically syncs in < 30s
- Scales with subscription count
- Batched database updates
- Progress logging

## Next Steps

Learn about file uploads:

👉 **[File Uploads](./file-uploads)**
