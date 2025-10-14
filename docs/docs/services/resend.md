---
sidebar_position: 5
---

# Resend Email Service

Complete reference for Resend email delivery.

## Overview

Resend provides email delivery for Kosuke Template with React Email templates.

## Dashboard

Access at [resend.com](https://resend.com)

## Configuration

### API Key

Found in **API Keys** section:

```bash
RESEND_API_KEY=re_...
```

**Permissions**:

- **Full Access**: Development and production
- **Sending Access**: Production (recommended)

### Sender Configuration

```bash
RESEND_FROM_EMAIL=onboarding@resend.dev     # Development
RESEND_FROM_EMAIL=hello@yourdomain.com      # Production
RESEND_FROM_NAME=Your Company Name
RESEND_REPLY_TO=support@yourdomain.com      # Optional
```

## Domain Verification

### Add Domain

1. Go to **Domains**
2. Click **Add Domain**
3. Enter domain: `yourdomain.com`
4. Add DNS records:

**SPF Record**:

```
Type: TXT
Name: @
Value: v=spf1 include:resend.com ~all
```

**DKIM Record**:

```
Type: TXT
Name: resend._domainkey
Value: [provided by Resend]
```

**DMARC Record** (recommended):

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

### Verification Status

- ⏳ **Pending**: DNS records not found
- ✅ **Verified**: Domain ready to use
- ❌ **Failed**: DNS configuration error

## Sending Emails

### Via API

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'hello@yourdomain.com',
  to: 'user@example.com',
  subject: 'Welcome!',
  html: '<p>Welcome to our app!</p>',
});
```

### With React Email

```typescript
import { sendEmail } from '@/lib/email';
import { WelcomeEmail } from '@/emails/welcome';

await sendEmail({
  to: 'user@example.com',
  subject: 'Welcome!',
  react: <WelcomeEmail userName="John" />,
});
```

## Email Analytics

View in Resend dashboard:

### Delivery Metrics

- **Sent**: Total emails sent
- **Delivered**: Successfully delivered
- **Bounced**: Failed delivery
- **Complained**: Marked as spam

### Engagement (if enabled)

- **Opens**: Email opened
- **Clicks**: Links clicked

Enable in **Settings → Tracking**

## Email Logs

View all sent emails:

1. Go to **Logs**
2. Filter by:
   - Status
   - Date range
   - Recipient
3. View details:
   - Delivery status
   - Error messages
   - Timestamps

## Deliverability

### Best Practices

1. **Verify domain**: Always use verified domain
2. **Warm up sending**: Gradually increase volume
3. **Monitor bounces**: Keep bounce rate < 5%
4. **Handle unsubscribes**: Respect opt-outs
5. **Authenticate emails**: SPF + DKIM + DMARC

### Bounce Handling

Types of bounces:

- **Hard bounce**: Invalid email (remove from list)
- **Soft bounce**: Temporary issue (retry)

### Spam Prevention

- Don't buy email lists
- Use double opt-in
- Easy unsubscribe
- Clear sender identity
- Relevant content only

## Rate Limits

### Free Tier

- **Daily**: 100 emails
- **Monthly**: 3,000 emails
- **Rate**: 2 per second

### Paid Plans

**Pro ($20/month)**:

- 50,000 emails/month
- Higher rate limits

**Enterprise**:

- Custom volume
- Dedicated IPs
- Advanced features

## Webhooks

### Email Events

Configure webhooks for:

- `email.delivered`
- `email.bounced`
- `email.complained`
- `email.opened` (if tracking enabled)
- `email.clicked` (if tracking enabled)

**Endpoint**: `https://yourdomain.com/api/email/webhook`

## Testing

### Resend Testing

1. Send test email from dashboard
2. Use sandbox mode (if available)
3. Check delivery to multiple providers

### Email Testing Tools

- [Mail Tester](https://www.mail-tester.com): Check spam score
- [GlockApps](https://glockapps.com): Deliverability testing
- [Litmus](https://litmus.com): Email client preview

## Troubleshooting

### Emails Not Sending

1. Check API key is correct
2. Verify sender domain
3. Check rate limits
4. View logs in dashboard

### High Bounce Rate

1. Verify email addresses
2. Clean email list
3. Check domain reputation
4. Remove hard bounces

### Spam Complaints

1. Add unsubscribe link
2. Send only to opted-in users
3. Improve email content
4. Monitor complaint rate

## Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Docs](https://react.email)
- [Email Best Practices](https://resend.com/docs/best-practices)
