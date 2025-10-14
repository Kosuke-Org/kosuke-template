---
sidebar_position: 1
---

# Clerk Authentication

Complete reference for Clerk authentication and organizations.

## Overview

Clerk provides authentication, user management, and organizations for Kosuke Template.

## Dashboard

Access at [dashboard.clerk.com](https://dashboard.clerk.com)

## Configuration

### API Keys

Found in **API Keys** section:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...  # Client-side
CLERK_SECRET_KEY=sk_test_...                   # Server-side
```

### Webhooks

Found in **Webhooks** section:

**Endpoint**: `https://yourdomain.com/api/clerk/webhook`

**Events**:

- User: created, updated, deleted
- Organization: created, updated, deleted
- Membership: created, updated, deleted

## Organizations

### Enable Organizations

1. **Settings → Organizations**
2. Toggle **Enable Organizations** ON
3. Configure:
   - Organization naming
   - Default roles
   - Permissions
   - Member limits

### Organization Roles

| Role       | Permissions                 |
| ---------- | --------------------------- |
| **Admin**  | Full access to organization |
| **Member** | Limited access              |

Custom roles available in paid plans.

## Authentication Methods

### Email + Password

Enabled by default.

### Magic Links

Passwordless authentication:

1. **User & Authentication → Email, Phone, Username**
2. Enable **Email magic links**

### Social Providers

Configure in **Social Connections**:

**Google**:

1. Create OAuth app in Google Console
2. Add credentials to Clerk
3. Enable Google in Clerk dashboard

**GitHub**:

1. Create OAuth app in GitHub Settings
2. Add credentials to Clerk
3. Enable GitHub in Clerk dashboard

## User Management

### User Dashboard

View and manage users:

- Search users
- View user details
- Ban/unban users
- Delete users
- Reset passwords

### User Metadata

Store custom data:

```typescript
// Public metadata (visible to user)
await user.update({
  publicMetadata: {
    onboardingComplete: true,
  },
});

// Private metadata (backend only)
await user.update({
  privateMetadata: {
    internalId: 'abc123',
  },
});
```

## Session Management

### Session Settings

Configure in **Settings → Sessions**:

- Session lifetime
- Inactive session lifetime
- Multi-session handling
- Single session mode

### Session Tokens

Clerk manages:

- Short-lived access tokens
- Refresh token rotation
- Secure cookie storage
- CSRF protection

## Security Features

### Multi-Factor Authentication

Enable in **User & Authentication → Multi-factor**:

- SMS verification
- Authenticator apps (TOTP)
- Backup codes

### Password Requirements

Configure in **User & Authentication → Password**:

- Minimum length
- Complexity requirements
- Leaked password detection
- Password history

### Email Verification

Required by default:

- Verification on signup
- Re-verification on change
- Custom email templates

## Customization

### Appearance

Customize in **Customization**:

- Brand colors
- Logo upload
- Button styles
- Layout options

### Email Templates

Customize in **Customization → Emails**:

- Welcome emails
- Verification emails
- Password reset emails
- Invitation emails

## Webhooks

### Event Types

**User Events**:

- `user.created`: New user signup
- `user.updated`: Profile changes
- `user.deleted`: Account deletion

**Organization Events**:

- `organization.created`: New organization
- `organization.updated`: Organization changes
- `organization.deleted`: Organization removed

**Membership Events**:

- `organizationMembership.created`: Member added
- `organizationMembership.updated`: Role changed
- `organizationMembership.deleted`: Member removed

### Webhook Testing

Test webhooks in Clerk dashboard:

1. Go to **Webhooks**
2. Click your endpoint
3. Send test event
4. View response

## Limits & Quotas

### Free Tier

- 10,000 Monthly Active Users (MAU)
- Unlimited organizations
- Email support

### Pro Tier

- 100,000 MAU
- Priority support
- Custom branding
- Advanced features

### Enterprise

- Unlimited MAU
- SSO support
- SLA guarantees
- Dedicated support

## Resources

- [Clerk Documentation](https://clerk.com/docs)
- [API Reference](https://clerk.com/docs/reference/backend-api)
- [SDKs](https://clerk.com/docs/references/overview)
- [Community](https://clerk.com/community)
