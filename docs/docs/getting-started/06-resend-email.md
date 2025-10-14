---
sidebar_position: 7
---

# Step 6: Configure Resend Email

Set up Resend for transactional email delivery including welcome emails, notifications, and password resets.

## Why Resend?

Resend provides:

- Modern email API
- React Email templates
- High deliverability rates
- Generous free tier (100 emails/day)
- Simple integration

## Step-by-Step Setup

### 1. Create Resend Account

1. Go to [resend.com](https://resend.com)
2. Click **"Sign up"**
3. Create account using email
4. Verify your email address
5. Complete the onboarding

### 2. Get API Key

1. In Resend dashboard, go to [resend.com/api-keys](https://resend.com/api-keys)
2. Click **"Create API Key"**
3. Configure:
   - **Name**: `your-project-name-api`
   - **Permission**: Select **"Full access"** (for development)
4. Click **"Create"**
5. **Copy the API key** (starts with `re_`)

:::warning Save API Key
The API key is shown only once. Copy and save it:

```
RESEND_API_KEY=re_your_api_key_here
```

:::

### 3. Configure Email Settings

#### For Development

Use Resend's default sending domain:

```bash
RESEND_FROM_EMAIL=onboarding@resend.dev
RESEND_FROM_NAME=Your Project Name
```

:::tip Development Domain
`onboarding@resend.dev` works immediately for testing. No domain verification needed.
:::

#### For Production

Verify your own domain:

1. Go to **Domains** in Resend dashboard
2. Click **"Add Domain"**
3. Enter your domain: `yourdomain.com`
4. Add DNS records (provided by Resend):
   - SPF record
   - DKIM record
   - DMARC record (recommended)
5. Wait for verification (can take up to 48 hours)
6. Use verified domain:
   ```bash
   RESEND_FROM_EMAIL=hello@yourdomain.com
   RESEND_FROM_NAME=Your Company Name
   ```

### 4. Optional: Reply-To Address

Configure where replies should go:

```bash
RESEND_REPLY_TO=support@yourdomain.com
```

Leave empty to use the from address as reply-to.

## Email Templates

Kosuke Template includes React Email templates:

### Welcome Email

Sent automatically when users sign up:

- **Template**: `emails/welcome.tsx`
- **Trigger**: User creation webhook from Clerk
- **Content**: Welcome message, getting started tips

### How Templates Work

```
User signs up → Clerk webhook → Database sync → Send welcome email
```

The email is sent asynchronously and won't block user creation if it fails.

## Developing Email Templates

### Preview Emails Locally

Run the React Email preview server:

```bash
pnpm run email:dev
```

Visit [localhost:3001](http://localhost:3001) to:

- Preview all email templates
- Test with different props
- View HTML and plain text versions
- Test responsive design

### Create New Templates

1. Create new file in `emails/` directory
2. Use React Email components
3. Import and send via the email service

Example template:

```tsx
import { BaseLayout } from './base-layout';
import { Section, Text, Button } from '@react-email/components';

export function NotificationEmail({ userName, message }: Props) {
  return (
    <BaseLayout preview="You have a new notification">
      <Section>
        <Text>Hello {userName}!</Text>
        <Text>{message}</Text>
        <Button href="https://yourapp.com">View Details</Button>
      </Section>
    </BaseLayout>
  );
}
```

## Email Features

### What's Included

- ✅ Welcome emails on signup
- ✅ HTML and plain text versions
- ✅ Error handling (non-blocking)
- ✅ Email validation
- ✅ Logging for debugging

### Future Email Ideas

Consider adding:

- Password reset emails (Clerk handles this)
- Billing notifications
- Team invitations
- Weekly digests
- Product updates

## Testing Emails

### Development Testing

1. **Preview Server**: View templates at `localhost:3001`
2. **Send Test**: Trigger user creation to send real email
3. **Check Logs**: View email logs in Vercel dashboard

### Production Testing

Before launching:

1. Verify domain in Resend
2. Send test emails to multiple providers
3. Check spam scores
4. Verify deliverability

Use tools like:

- [Mail Tester](https://www.mail-tester.com)
- [GlockApps](https://glockapps.com)

## Email Deliverability

### Best Practices

1. **Domain Verification**: Always verify your domain
2. **SPF/DKIM/DMARC**: Configure all DNS records
3. **Warm-up**: Gradually increase sending volume
4. **Monitor**: Check bounce and complaint rates

### DNS Records

When verifying your domain, add these records:

#### SPF Record

```
v=spf1 include:resend.com ~all
```

#### DKIM Record

```
Provided by Resend (unique per domain)
```

#### DMARC Record

```
v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com
```

## Rate Limits

### Free Tier

- **Daily**: 100 emails
- **Monthly**: 3,000 emails
- **Rate**: Sufficient for development and small apps

### Paid Plans

- **Pro**: $20/month (50,000 emails)
- **Business**: Custom pricing
- **Volume discounts**: Available

## Common Questions

### What if email fails to send?

The template handles failures gracefully:

- User creation still succeeds
- Error is logged to Sentry
- Can retry manually if needed

### Can I use a different email provider?

Yes, the email service is abstracted:

1. Update `lib/email/index.ts`
2. Implement your provider's API
3. Keep the same interface

### How do I track email opens?

Resend includes:

- Open tracking (optional)
- Click tracking
- Webhook events for email events

Enable in Resend dashboard.

### What about email templates in other languages?

React Email supports:

- Multiple language templates
- Dynamic content based on user locale
- Translation libraries

Implement as needed for your users.

## Save Your Configuration

You now have all Resend credentials:

```bash
# API Key
RESEND_API_KEY=re_your_api_key_here

# Sender Configuration
RESEND_FROM_EMAIL=onboarding@resend.dev  # or your verified domain
RESEND_FROM_NAME=Your Project Name

# Optional
RESEND_REPLY_TO=support@yourdomain.com
```

## Next Steps

With email configured, set up error monitoring:

👉 **[Step 7: Configure Sentry Monitoring](./07-sentry-monitoring.md)**

---

**Having issues?** Check the [Troubleshooting](../reference/troubleshooting) guide or [Resend docs](https://resend.com/docs).
