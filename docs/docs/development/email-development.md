---
sidebar_position: 4
---

# Email Development

Developing and testing email templates with React Email and Resend.

## React Email Preview

### Start Preview Server

```bash
# Preview server only (port 3001)
pnpm run email:dev

# Dev server + email preview
pnpm run dev:email
```

Visit [localhost:3001](http://localhost:3001)

## Creating Templates

### Template Structure

```typescript
// emails/notification.tsx
import { BaseLayout } from './base-layout';
import { Section, Text, Button, Heading } from '@react-email/components';

interface NotificationEmailProps {
  userName: string;
  message: string;
  actionUrl: string;
}

export function NotificationEmail({
  userName,
  message,
  actionUrl
}: NotificationEmailProps) {
  return (
    <BaseLayout preview="You have a new notification">
      <Section>
        <Heading>Hello {userName}!</Heading>
        <Text>{message}</Text>
        <Button href={actionUrl}>
          View Details
        </Button>
      </Section>
    </BaseLayout>
  );
}
```

### Base Layout

All emails extend `BaseLayout`:

```typescript
// emails/base-layout.tsx
import { Html, Head, Preview, Body, Container } from '@react-email/components';

export function BaseLayout({
  preview,
  children
}: {
  preview: string;
  children: React.ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {children}
        </Container>
      </Body>
    </Html>
  );
}
```

## Sending Emails

### Using Email Service

```typescript
import { sendEmail } from '@/lib/email';
import { NotificationEmail } from '@/emails/notification';

await sendEmail({
  to: 'user@example.com',
  subject: 'New Notification',
  react: (
    <NotificationEmail
      userName="John"
      message="You have a new message"
      actionUrl="https://app.com/messages"
    />
  ),
});
```

### Error Handling

```typescript
try {
  await sendEmail({ ... });
  console.log('Email sent successfully');
} catch (error) {
  console.error('Failed to send email:', error);
  // Log to Sentry
  Sentry.captureException(error);
}
```

## Testing Emails

### Preview in Browser

1. Start preview server: `pnpm run email:dev`
2. Open [localhost:3001](http://localhost:3001)
3. Select template from list
4. Test with different props
5. Check responsive design

### Send Test Email

```typescript
// Create test script
import { sendEmail } from '@/lib/email';
import { WelcomeEmail } from '@/emails/welcome';

await sendEmail({
  to: 'your-email@example.com',
  subject: 'Test Welcome Email',
  react: <WelcomeEmail userName="Test User" />,
});
```

### Check Deliverability

1. Send to multiple providers:
   - Gmail
   - Outlook
   - Yahoo
   - ProtonMail
2. Check spam folder
3. Use [Mail Tester](https://mail-tester.com)

## Email Components

### Available Components

```typescript
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Link,
  Hr,
  Img,
} from '@react-email/components';
```

### Button Component

```typescript
<Button
  href="https://example.com"
  style={{
    backgroundColor: '#6366f1',
    color: '#ffffff',
    padding: '12px 20px',
    borderRadius: '4px',
  }}
>
  Click Here
</Button>
```

### Responsive Images

```typescript
<Img
  src="https://example.com/logo.png"
  width="150"
  height="50"
  alt="Company Logo"
/>
```

## Styling

### Inline Styles

```typescript
const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

<Body style={main}>
  <Container style={container}>
    {children}
  </Container>
</Body>
```

### Tailwind CSS

React Email supports Tailwind:

```typescript
import { Tailwind } from '@react-email/components';

export function Email() {
  return (
    <Tailwind>
      <div className="bg-white p-8">
        <h1 className="text-2xl font-bold">Hello!</h1>
      </div>
    </Tailwind>
  );
}
```

## Email Testing Tools

### Preview Server

- Test all templates
- See HTML and plain text
- Check responsive design

### Resend Dashboard

- View sent emails
- Check delivery status
- Monitor bounce rate
- View error logs

### Mail Tester

- Check spam score
- Verify SPF/DKIM
- Test deliverability

## Best Practices

1. **Always include plain text** version
2. **Keep design simple** - not all clients support modern CSS
3. **Test across clients** - Gmail, Outlook, Apple Mail
4. **Optimize images** - use CDN, compress images
5. **Include unsubscribe link** - required for marketing emails
6. **Use preview text** - shows in inbox preview
7. **Mobile-first design** - most emails opened on mobile

## Export Templates

```bash
# Export to static HTML
pnpm run email:export

# Output in .react-email/ directory
```

Use exported HTML for:

- Third-party email services
- Email testing tools
- Manual sending

## Common Issues

### Preview Not Loading

```bash
# Clear cache
rm -rf .react-email
pnpm run email:dev
```

### Styles Not Working

- Use inline styles for maximum compatibility
- Avoid modern CSS (flexbox, grid)
- Test in multiple email clients

### Images Not Showing

- Use absolute URLs
- Host on CDN
- Configure CORS headers

## Next Steps

Learn about code quality:

👉 **[Code Quality](./code-quality)**
