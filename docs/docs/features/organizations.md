---
sidebar_position: 1
---

# Organizations & Teams

Complete multi-tenancy with organizations, teams, and role-based access control.

## Overview

Kosuke Template includes full organization support using Clerk's Organizations feature, enabling true multi-tenant SaaS functionality.

## Key Features

- ✅ **Organization Creation**: Users can create unlimited organizations
- ✅ **Team Invitations**: Invite members via email
- ✅ **Role Management**: Admin and member roles
- ✅ **Organization Switching**: Easy context switching
- ✅ **Member Management**: View, edit, remove members
- ✅ **Organization Settings**: Logo, name, metadata
- ✅ **Organization Subscriptions**: Billing per organization

## Creating Organizations

Users can create organizations from the organization switcher or dedicated page.

### Organization Structure

```typescript
interface Organization {
  id: number;
  clerkOrganizationId: string;
  name: string;
  slug: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Automatic Sync

Organizations are automatically synced from Clerk to your database via webhooks.

## Team Management

### Inviting Members

1. Admin opens member management
2. Clicks "Invite Member"
3. Enters email and selects role
4. Clerk sends invitation email
5. Invitee accepts invitation
6. Automatically added to organization

### Managing Members

- View all members
- Update roles (admin only)
- Remove members (admin only)
- View invitation status

## Roles & Permissions

| Role       | Create Org | Invite Members | Manage Billing | Remove Members | View Data |
| ---------- | ---------- | -------------- | -------------- | -------------- | --------- |
| **Admin**  | ✅         | ✅             | ✅             | ✅             | ✅        |
| **Member** | ✅         | ❌             | ❌             | ❌             | ✅        |

### Custom Roles

You can define custom roles in Clerk dashboard with fine-grained permissions.

## Organization Context

### Server Components

```typescript
import { auth } from '@clerk/nextjs';

export default async function Page() {
  const { orgId, orgRole } = auth();

  // orgId: Current organization ID
  // orgRole: User's role in organization

  if (!orgId) {
    return <SelectOrganization />;
  }

  return <OrganizationDashboard />;
}
```

### Client Components

```typescript
'use client';
import { useOrganization } from '@clerk/nextjs';

export function Component() {
  const { organization, membership } = useOrganization();

  if (!organization) {
    return <NoOrganization />;
  }

  return (
    <div>
      <h1>{organization.name}</h1>
      <p>Your role: {membership.role}</p>
    </div>
  );
}
```

## Organization Switching

Users can switch between organizations using the organization switcher component.

### Switching Context

When a user switches organizations:

1. All subsequent requests use new organization context
2. Data is filtered by new organization
3. Permissions update based on role in new organization

## Data Isolation

All organization data is automatically isolated:

```typescript
// Queries automatically filtered by organization
const data = await db.select().from(projects).where(eq(projects.organizationId, orgId));
```

## Organization Subscriptions

Organizations can have their own subscriptions:

- Billing attached to organization
- All members benefit from organization plan
- Only admins can manage billing

## Best Practices

### 1. Always Check Organization Context

```typescript
const { orgId } = auth();
if (!orgId) {
  return <SelectOrganization />;
}
```

### 2. Verify Permissions

```typescript
const { orgRole } = auth();
if (orgRole !== 'admin') {
  return <div>Admin only</div>;
}
```

### 3. Filter Data by Organization

```typescript
// Always include organization filter
.where(eq(table.organizationId, orgId))
```

## Next Steps

Learn about subscription management:

👉 **[Subscription Management](./subscription-management)**

---

**Questions?** Check the [Reference](../reference/commands) section.
