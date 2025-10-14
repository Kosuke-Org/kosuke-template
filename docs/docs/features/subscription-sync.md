---
sidebar_position: 4
---

# Subscription Synchronization

Automated subscription data synchronization using webhooks and cron jobs.

## Dual Sync System

Kosuke Template uses two methods to keep subscription data in sync:

### 1. Real-Time Webhooks

Immediate updates when events occur in Polar:

```
Polar Event → Webhook → Database Update → User Access Updated
```

**Benefits**:

- Instant updates
- No delay in access changes
- Real-time billing status

**Handled Events**:

- `subscription.created`: New subscription
- `subscription.updated`: Plan changes, payment updates
- `subscription.canceled`: Subscription ends

### 2. Scheduled Cron Jobs

Backup synchronization every 6 hours:

```
Vercel Cron → Polar API → Database Sync
```

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

Located at `/api/billing/webhook`:

```typescript
export async function POST(req: Request) {
  // 1. Verify webhook signature
  const isValid = await verifyWebhook(req);
  if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 401 });

  // 2. Parse event
  const event = await req.json();

  // 3. Handle event type
  switch (event.type) {
    case 'subscription.created':
      await createSubscription(event.data);
      break;
    case 'subscription.updated':
      await updateSubscription(event.data);
      break;
    case 'subscription.canceled':
      await cancelSubscription(event.data);
      break;
  }

  return Response.json({ received: true });
}
```

### Cron Handler

Located at `/api/cron/sync-subscriptions`:

```typescript
export async function GET(req: Request) {
  // 1. Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Fetch all subscriptions from Polar
  const polarSubs = await polar.subscriptions.list();

  // 3. Sync to database
  for (const sub of polarSubs) {
    await syncSubscription(sub);
  }

  return Response.json({ synced: polarSubs.length });
}
```

## Cron Configuration

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

**Schedule Format**: Cron expression

- `0 */6 * * *`: Every 6 hours at minute 0
- Runs at: 00:00, 06:00, 12:00, 18:00 UTC

## Security

### Webhook Verification

Webhooks verified using signing secret:

```typescript
const signature = req.headers.get('webhook-signature');
const isValid = await verifySignature(payload, signature, secret);
```

### Cron Authentication

Cron endpoints protected with bearer token:

```typescript
const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return unauthorized();
}
```

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

Database subscription states:

```typescript
type SubscriptionStatus =
  | 'active' // Currently active
  | 'canceled' // Canceled, access until period end
  | 'incomplete' // Payment failed
  | 'past_due'; // Payment retry in progress
```

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

```bash
# Call cron endpoint manually
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://yourdomain.com/api/cron/sync-subscriptions
```

Or trigger in Vercel dashboard.

### Verify Sync

```bash
# Check database
pnpm run db:studio

# Compare with Polar dashboard
# Verify all subscriptions match
```

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
