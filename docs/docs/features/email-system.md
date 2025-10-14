---
sidebar_position: 3
---

# Email System

Transactional emails with React Email and Resend.

## Overview

Kosuke Template includes a complete email system:

- React Email templates
- Resend delivery
- Welcome emails on signup
- Customizable templates

## Templates

### Welcome Email

Sent automatically when users sign up:

```typescript
import { WelcomeEmail } from '@/emails/welcome';

await sendEmail({
  to: user.email,
  subject: 'Welcome!',
  react: <WelcomeEmail name={user.name} />,
});
```

### Creating Templates

Create new templates in `/emails` directory:

```typescript
import { BaseLayout } from './base-layout';
import { Section, Text, Button } from '@react-email/components';

export function NotificationEmail({ name, message }: Props) {
  return (
    <BaseLayout preview="New notification">
      <Section>
        <Text>Hello {name}!</Text>
        <Text>{message}</Text>
        <Button href="https://yourapp.com">View Details</Button>
      </Section>
    </BaseLayout>
  );
}
```

## Development

Preview emails locally:

```bash
pnpm run email:dev
```

Visit [localhost:3001](http://localhost:3001) to preview all templates.

## Sending Emails

```typescript
import { sendEmail } from '@/lib/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Your Subject',
  react: <YourTemplate />,
});
```

## Best Practices

1. **Test templates** in preview before deploying
2. **Verify domain** for production
3. **Handle failures** gracefully (non-blocking)
4. **Include plain text** versions
5. **Monitor deliverability** in Resend dashboard

## Next Steps

Learn about deployment:

👉 **[Deployment](../deployment/vercel-deployment)**
