---
sidebar_position: 5
---

# Security Best Practices

Security guidelines for production Kosuke Template deployments.

## Environment Variables

### Never Commit Secrets

```bash
# ✅ Good: Use environment variables
const apiKey = process.env.API_KEY;

# ❌ Bad: Hardcoded secrets
const apiKey = 'sk_live_abc123';
```

### Rotate API Keys Regularly

- Change keys every 90 days
- Rotate immediately if compromised
- Use different keys for dev/prod
- Store securely (password manager)

### Use Minimum Permissions

When creating API tokens:

- Select only required scopes
- Don't use "full access" in production
- Review permissions regularly

## Webhook Security

### Verify Webhook Signatures

Always verify webhook signatures:

```typescript
// Clerk webhook verification (already implemented)
const evt = await webhook.verify(payload, headers);

// Polar webhook verification (already implemented)
const isValid = await verifyPolarWebhook(payload, signature);
```

### Protect Webhook Endpoints

```typescript
// Cron job protection (already implemented)
const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 });
}
```

### Use HTTPS Only

- All webhook URLs must use HTTPS
- Vercel provides SSL automatically
- Reject HTTP requests in production

## Authentication

### Session Security

Clerk handles session security:

- Secure HTTP-only cookies
- Short-lived access tokens
- Refresh token rotation
- CSRF protection

### Password Requirements

Configure in Clerk dashboard:

- Minimum length (8+ characters)
- Complexity requirements
- Leaked password detection
- Password history

### Multi-Factor Authentication

Enable MFA for sensitive operations:

1. Go to Clerk dashboard
2. User & Authentication → Multi-factor
3. Enable SMS or authenticator apps
4. Optional: Require for admin roles

## Database Security

### Connection Security

- Always use SSL: `?sslmode=require`
- Use connection pooling
- Never expose connection string
- Rotate database credentials

### Query Safety

Drizzle ORM prevents SQL injection:

```typescript
// ✅ Safe: Parameterized query
await db.select().from(users).where(eq(users.id, userId));

// ❌ Dangerous: String concatenation (Drizzle doesn't allow this)
// Never do raw SQL with user input
```

### Access Control

```typescript
// Always verify ownership
const item = await db
  .select()
  .from(items)
  .where(and(eq(items.id, id), eq(items.userId, userId)));

if (!item) throw new Error('Unauthorized');
```

## API Security

### Rate Limiting

Consider adding rate limiting:

- Use Vercel's built-in rate limiting
- Implement custom rate limiting
- Protect expensive operations

### Input Validation

Always validate input with Zod:

```typescript
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
});

const data = schema.parse(input);
```

### CORS Configuration

Configure CORS for API routes:

```typescript
export async function GET(req: Request) {
  const origin = req.headers.get('origin');

  // Only allow your domains
  const allowedOrigins = ['https://yourdomain.com', 'https://www.yourdomain.com'];

  if (!origin || !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
  }

  // ... rest of handler
}
```

## File Upload Security

### Validate File Types

```typescript
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

if (!allowedTypes.includes(file.type)) {
  throw new Error('Invalid file type');
}
```

### Limit File Size

```typescript
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

if (file.size > MAX_SIZE) {
  throw new Error('File too large');
}
```

### Scan for Malware

Consider integrating:

- VirusTotal API
- Cloudflare Images
- Content Security Policy

## Monitoring & Logging

### Error Tracking

Sentry captures:

- Unhandled exceptions
- API errors
- Performance issues
- User feedback

### Audit Logs

Log sensitive operations:

- User deletions
- Permission changes
- Billing events
- Organization changes

### Alerts

Configure alerts for:

- Failed login attempts
- Unusual API usage
- Database errors
- Payment failures

## Security Headers

Vercel sets security headers automatically:

```typescript
// next.config.ts includes:
{
  headers: [
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'Referrer-Policy',
      value: 'origin-when-cross-origin',
    },
  ],
}
```

## Compliance

### GDPR Compliance

For EU users:

- Cookie consent banner
- Privacy policy
- Data export functionality
- Right to deletion

### Data Retention

Configure retention policies:

- User data: Until account deletion
- Logs: 30-90 days
- Backups: 7-30 days

### Privacy Policy

Update privacy policy to cover:

- What data you collect
- How you use it
- Third-party services
- User rights

## Regular Security Tasks

### Weekly

- [ ] Review error logs
- [ ] Check failed login attempts
- [ ] Monitor webhook delivery

### Monthly

- [ ] Review access logs
- [ ] Audit API keys
- [ ] Update dependencies
- [ ] Review permissions

### Quarterly

- [ ] Rotate API keys
- [ ] Security audit
- [ ] Review third-party services
- [ ] Update security policies

## Security Checklist

Before launching:

- [ ] All API keys are production credentials
- [ ] Webhook secrets are unique and secure
- [ ] CRON_SECRET is randomly generated
- [ ] HTTPS enabled on all endpoints
- [ ] Environment variables not in code
- [ ] Database uses SSL
- [ ] Session security configured
- [ ] Rate limiting enabled
- [ ] Error messages don't expose secrets
- [ ] Logs don't contain sensitive data
- [ ] Security headers configured
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Sentry alerts configured

## Incident Response

If security incident occurs:

1. **Immediately**: Rotate compromised credentials
2. **Investigate**: Check logs for unauthorized access
3. **Notify**: Inform affected users if needed
4. **Document**: Record incident details
5. **Improve**: Update security measures

## Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Vercel Security](https://vercel.com/docs/security)

## Next Steps

Review monitoring setup:

👉 **[Monitoring Guide](./monitoring)**
