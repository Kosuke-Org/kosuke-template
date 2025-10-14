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

The application automatically tracks which organization the user is currently viewing. This context is available in both server and client components, ensuring all data and actions are scoped to the correct organization.

## Organization Switching

Users can switch between organizations using the organization switcher component.

### Switching Context

When a user switches organizations:

1. All subsequent requests use new organization context
2. Data is filtered by new organization
3. Permissions update based on role in new organization

## Data Isolation

All organization data is automatically isolated. Database queries are filtered by organization ID, ensuring members can only access data belonging to their current organization. This provides complete data security in multi-tenant environments.

## Organization Subscriptions

Organizations can have their own subscriptions:

- Billing attached to organization
- All members benefit from organization plan
- Only admins can manage billing

## Best Practices

### 1. Always Check Organization Context

Verify that users have selected an organization before showing organization-specific content. Users without an organization should be prompted to create or select one.

### 2. Verify Permissions

Check user roles before allowing sensitive operations. Only admins should be able to manage billing, invite members, or modify organization settings.

### 3. Filter Data by Organization

All database queries for organization-specific data should be automatically filtered by the current organization ID to ensure proper data isolation.

## Next Steps

Learn about subscription management:

👉 **[Subscription Management](./subscription-management)**

---

**Questions?** Check the [Reference](../../reference/commands) section.
