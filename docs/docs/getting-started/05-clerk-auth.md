---
sidebar_position: 6
---

# Step 5: Configure Clerk Authentication

Set up Clerk for user authentication with full Organizations support for multi-tenant functionality.

## Why Clerk?

Clerk provides:

- Complete authentication solution
- Organizations & Teams built-in
- Social login providers
- User management dashboard
- Webhook notifications
- Beautiful pre-built UI components

## Step-by-Step Setup

### 1. Create Clerk Account

1. Go to [dashboard.clerk.com](https://dashboard.clerk.com)
2. Sign up using GitHub (recommended) or email
3. Complete the onboarding process

### 2. Create Application

1. Click **"Add application"**
2. **Application name**: Enter your project name
3. **Framework**: Select **"Next.js"**
4. Click **"Create application"**

### 3. Get API Keys

After creation, you'll see your API keys:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

:::tip Save These Keys
Copy both keys immediately. You'll add them to Vercel environment variables later.
:::

### 4. Enable Organizations

Organizations are required for multi-tenant functionality:

1. In your Clerk app, go to **Settings → Organizations**
2. Toggle **"Enable Organizations"** to ON
3. Configure organization settings:

#### Organization Naming

- ☑️ Allow custom names
- Users can name their organizations

#### Roles & Permissions

- **Default roles**: admin, member (recommended)
- **Custom roles**: Optional, configure if needed
- **Permissions**: Review default permissions

4. Click **"Save"**

:::info Organizations vs Personal Accounts

- **Organizations**: Team workspaces with multiple members
- **Personal Account**: Individual user workspace
- Both are supported in Kosuke Template
  :::

### 5. Set Up Webhook

Configure webhooks for user and organization synchronization:

1. In Clerk dashboard, go to **"Webhooks"**
2. Click **"Add Endpoint"**
3. **Endpoint URL**: `https://your-project-name.vercel.app/api/clerk/webhook`
4. **Subscribe to events**:

#### User Events (Required)

- ☑️ `user.created`
- ☑️ `user.updated`
- ☑️ `user.deleted`

#### Organization Events (Required)

- ☑️ `organization.created`
- ☑️ `organization.updated`
- ☑️ `organization.deleted`

#### Membership Events (Required)

- ☑️ `organizationMembership.created`
- ☑️ `organizationMembership.updated`
- ☑️ `organizationMembership.deleted`

#### Invitation Events (Optional - Logging Only)

- ☐ `organizationInvitation.created`
- ☐ `organizationInvitation.accepted`
- ☐ `organizationInvitation.revoked`

5. Click **"Create"**
6. **Copy the Signing Secret** (starts with `whsec_`)

:::info Invitation Events
Invitation events are logged but not used for business logic. When an invitation is accepted, the `organizationMembership.created` event handles the actual membership sync.
:::

## Organization Features

### What's Included

Kosuke Template provides:

- ✅ **Organization Creation**: Users can create organizations
- ✅ **Member Invitations**: Invite via email with role assignment
- ✅ **Role Management**: Admin and member roles
- ✅ **Organization Switching**: Easy context switching
- ✅ **Member Management**: View, edit, remove members
- ✅ **Organization Settings**: Logo, name, metadata

### Organization Roles

| Role       | Permissions                                  |
| ---------- | -------------------------------------------- |
| **Admin**  | Full access: invite, remove, manage settings |
| **Member** | Standard access: view data, limited actions  |

### Organization Subscriptions

Organizations can have subscriptions:

- Billing is attached to organization
- All members benefit from organization's plan
- Only admins can manage billing

## Authentication Methods

### Supported by Default

- ✉️ **Email + Password**
- 🔗 **Magic Links** (passwordless)

### Optional Social Providers

Enable in **User & Authentication → Social Connections**:

- 🔵 Google OAuth
- 🐙 GitHub OAuth
- 🔷 Microsoft OAuth
- And more...

:::tip Social Login Setup
Configure social providers after initial deployment. Each requires OAuth app creation with the provider.
:::

## Additional Configuration

### Optional Setup (After Deployment)

1. **Social Connections**
   - Go to **User & Authentication → Social Connections**
   - Enable Google OAuth (recommended)
   - Configure other providers as needed

2. **User Model**
   - Go to **User & Authentication → User Model**
   - Disable "First and last name" (optional)
   - Template uses username/email only

3. **Organization Settings**
   - Go to **Configure → Organization Management → Settings**
   - Enable "Allow personal account" (recommended)
   - Customize organization invitation emails

4. **Customization**
   - Go to **Customization**
   - Customize colors, logos
   - Customize email templates

## How Authentication Works

### User Flow

1. User visits sign-in page
2. Clerk handles authentication
3. User redirected to app
4. Webhook syncs user to database
5. User can create/join organizations

### Organization Flow

1. User creates organization
2. Clerk handles organization creation
3. Webhook syncs to database
4. User becomes organization admin
5. Can invite team members

### Session Management

Clerk manages:

- Session tokens
- Refresh tokens
- Multi-session support
- Secure cookie storage

## Testing Authentication

### Local Testing

1. Start your development server
2. Visit `/sign-in`
3. Create test account
4. Verify webhook receives user
5. Check database for synced user

### Test Organization Features

1. Create test organization
2. Invite test user (use email)
3. Accept invitation
4. Verify member sync
5. Test role permissions

## Common Questions

### Do I need to handle password resets?

No, Clerk handles:

- Password reset flows
- Email verification
- Account recovery
- Security settings

### Can I customize the auth UI?

Yes, multiple options:

- Use Clerk's components (pre-built)
- Customize with CSS
- Build custom UI with Clerk's API

The template uses Clerk's components (recommended).

### What about multi-factor authentication?

Clerk includes:

- SMS verification
- Authenticator apps
- Backup codes
- Enterprise SSO (paid plans)

Enable in **User & Authentication → Multi-factor**.

### How do I test webhooks locally?

Use Clerk's webhook testing or:

1. Deploy to Vercel (preview)
2. Use ngrok for local testing
3. Check webhook logs in Clerk dashboard

## Save Your Configuration

You now have all Clerk credentials:

```bash
# API Keys
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Webhook
CLERK_WEBHOOK_SECRET=whsec_...

# URLs (already in template)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

## Next Steps

With authentication configured, set up email:

👉 **[Step 6: Configure Resend Email](./06-resend-email.md)**

---

**Having issues?** Check the [Troubleshooting](../reference/troubleshooting) guide or [Clerk docs](https://clerk.com/docs).
