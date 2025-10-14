---
sidebar_position: 3
---

# Clerk Production Setup

Configure Clerk for production with custom domains and OAuth.

## Overview

Clerk development keys work in production, but you should configure custom domains and production OAuth apps.

## Custom Domains

### Add Production Domain

1. In Clerk dashboard, go to **Settings → Domain**
2. Click **Add Domain**
3. Enter your domain: `yourdomain.com`
4. Add subdomains if needed
5. Remove development domains

### Update Environment Variables

```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Production OAuth

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create production OAuth app
3. Add authorized redirect URI:
   ```
   https://yourdomain.com/api/auth/callback/google
   ```
4. Update Clerk with production credentials

### GitHub OAuth

1. Go to GitHub Settings → Developer settings
2. Create new OAuth app
3. Set callback URL:
   ```
   https://yourdomain.com/api/auth/callback/github
   ```
4. Update Clerk with production credentials

## Update Webhooks

1. In Clerk dashboard, go to **Webhooks**
2. Update endpoint URL:
   ```
   https://yourdomain.com/api/clerk/webhook
   ```
3. Verify events are still selected
4. Test webhook delivery

## Organizations

Ensure organizations are enabled:

1. **Settings → Organizations**
2. Verify **Enable Organizations** is ON
3. Review organization settings
4. Test organization creation

## Production Keys

Clerk automatically provides production keys:

- Publishable key: `pk_live_...`
- Secret key: `sk_live_...`

Update if keys changed:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
```

## Testing

1. Sign up with real email
2. Create organization
3. Invite team member
4. Test OAuth providers
5. Verify webhook delivery

## Next Steps

Configure custom domains:

👉 **[Custom Domains Setup](./custom-domains)**
