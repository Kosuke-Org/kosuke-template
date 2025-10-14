---
sidebar_position: 4
---

# Authentication Flow

How authentication and multi-tenancy work in Kosuke Template using Clerk Organizations.

## Overview

Kosuke Template uses Clerk for authentication with full Organizations support, enabling multi-tenant SaaS functionality.

## User Authentication

### Sign-Up Flow

```
1. User visits /sign-up
2. Clerk handles registration
3. User verifies email
4. Clerk webhook fires: user.created
5. Database syncs user data
6. Redirect to /onboarding
7. User can create organization
```

### Sign-In Flow

```
1. User visits /sign-in
2. Enters credentials
3. Clerk validates
4. Session created
5. Redirect to app
6. Organization context loaded
```

## Organizations & Multi-Tenancy

### Organization Creation

```
1. User clicks "Create Organization"
2. Clerk UI opens
3. User enters organization name
4. Clerk webhook fires: organization.created
5. Database syncs organization
6. User becomes admin
7. Can invite team members
```

### Organization Switching

```typescript
// User can belong to multiple organizations
const { organization, setActive } = useOrganization();

// Switch organization
await setActive({ organization: orgId });

// All subsequent requests use new org context
```

## Session Management

### Server Components

```typescript
import { auth } from '@clerk/nextjs';

export default async function Page() {
  const { userId, orgId } = auth();

  if (!userId) redirect('/sign-in');

  // userId: Current user
  // orgId: Active organization (if any)
}
```

### Client Components

```typescript
'use client';
import { useUser, useOrganization } from '@clerk/nextjs';

export function Component() {
  const { user, isLoaded } = useUser();
  const { organization } = useOrganization();

  if (!isLoaded) return <Skeleton />;
  if (!user) return <SignInButton />;

  return <div>Hello {user.firstName}</div>;
}
```

### Middleware

```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware();

// Protects routes automatically
// Redirects to sign-in if needed
```

## Authorization

### Role-Based Access

```typescript
import { auth } from '@clerk/nextjs';

export default async function AdminPage() {
  const { orgRole } = auth();

  if (orgRole !== 'admin') {
    return <div>Access Denied</div>;
  }

  return <AdminPanel />;
}
```

### Permission Checks

```typescript
function canManageBilling(orgRole: string) {
  return orgRole === 'admin';
}

function canInviteMembers(orgRole: string) {
  return orgRole === 'admin';
}

function canViewData(orgRole: string) {
  return ['admin', 'member'].includes(orgRole);
}
```

## Organization Roles

| Role       | Permissions                                    |
| ---------- | ---------------------------------------------- |
| **Admin**  | Full access: manage members, settings, billing |
| **Member** | Read access: view data, limited actions        |

### Custom Roles

Clerk supports custom roles:

1. Go to Clerk dashboard
2. Settings → Organizations → Roles
3. Define custom roles
4. Assign permissions

## Team Invitations

### Invitation Flow

```
1. Admin clicks "Invite Member"
2. Enters email and role
3. Clerk sends invitation email
4. Invitee clicks link
5. Signs up/in
6. Accepts invitation
7. Webhook: organizationMembership.created
8. Database syncs membership
9. Member has access
```

### Invitation Management

```typescript
import { useOrganization } from '@clerk/nextjs';

export function InviteButton() {
  const { organization } = useOrganization();

  const handleInvite = async () => {
    await organization.inviteMember({
      emailAddress: 'user@example.com',
      role: 'member',
    });
  };

  return <Button onClick={handleInvite}>Invite</Button>;
}
```

## Data Isolation

### Organization-Scoped Queries

```typescript
import { auth } from '@clerk/nextjs';
import { db } from '@/lib/db/drizzle';

export async function getOrganizationData() {
  const { orgId } = auth();

  if (!orgId) throw new Error('No organization context');

  // All queries filtered by organization
  const data = await db
    .select()
    .from(organizationData)
    .where(eq(organizationData.organizationId, orgId));

  return data;
}
```

### Personal vs Organization Data

```typescript
// Personal data: Tied to user
const { userId } = auth();
const userData = await getUserData(userId);

// Organization data: Tied to organization
const { orgId } = auth();
const orgData = await getOrganizationData(orgId);
```

## Subscription Context

### Personal Subscriptions

```typescript
// User's personal subscription
const subscription = await getUserSubscription(userId);

if (subscription.tier === 'pro') {
  // User has pro features
}
```

### Organization Subscriptions

```typescript
// Organization's subscription
const orgSub = await getOrganizationSubscription(orgId);

// All members benefit from org subscription
if (orgSub.tier === 'business') {
  // Entire team has business features
}
```

## Webhook Synchronization

### User Events

```typescript
// Webhook handler: /api/clerk/webhook
export async function POST(req: Request) {
  const event = await req.json();

  switch (event.type) {
    case 'user.created':
      await createUser(event.data);
      break;
    case 'user.updated':
      await updateUser(event.data);
      break;
    case 'user.deleted':
      await deleteUser(event.data);
      break;
  }
}
```

### Organization Events

```typescript
switch (event.type) {
  case 'organization.created':
    await createOrganization(event.data);
    break;
  case 'organization.updated':
    await updateOrganization(event.data);
    break;
  case 'organizationMembership.created':
    await addMember(event.data);
    break;
}
```

## Security Best Practices

### 1. Always Verify User Context

```typescript
// ✅ Good: Check user ID
const { userId } = auth();
if (!userId) throw new Error('Unauthorized');

// ❌ Bad: Trust client data
const userId = req.body.userId; // Never do this
```

### 2. Verify Organization Access

```typescript
// ✅ Good: Verify org membership
const member = await db
  .select()
  .from(organizationMemberships)
  .where(
    and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.organizationId, orgId)
    )
  );

if (!member) throw new Error('Not a member');
```

### 3. Check Permissions

```typescript
// ✅ Good: Verify role
const { orgRole } = auth();
if (orgRole !== 'admin') {
  throw new Error('Admin only');
}
```

### 4. Sanitize Data

```typescript
// ✅ Good: Use Zod validation
const schema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
});

const data = schema.parse(req.body);
```

## Testing Authentication

### Local Testing

```bash
# 1. Start dev server
pnpm run dev

# 2. Visit /sign-up
# 3. Create test account
# 4. Check database for synced user
```

### Organization Testing

```bash
# 1. Sign in as test user
# 2. Create organization
# 3. Invite another test email
# 4. Accept invitation
# 5. Switch between organizations
```

## Common Patterns

### Protect Server Actions

```typescript
'use server';

export async function deleteItem(id: number) {
  const { userId } = auth();
  if (!userId) throw new Error('Unauthorized');

  // Verify ownership
  const item = await db.select().from(items).where(eq(items.id, id));

  if (item.userId !== userId) {
    throw new Error('Not authorized');
  }

  await db.delete(items).where(eq(items.id, id));
}
```

### Protect API Routes

```typescript
// app/api/data/route.ts
import { auth } from '@clerk/nextjs';

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const data = await getData(userId);
  return Response.json(data);
}
```

## Next Steps

Explore key features:

👉 **[Organizations Feature](../features/organizations)**

---

**Questions?** Check the [Reference](../reference/commands) section.
