# 🏢 Organizations & Teams Migration Plan

**Migration Type**: User Auth → Organizations & Teams  
**Started**: October 1, 2025  
**Estimated Completion**: 3-4 weeks  
**Status**: 🔄 In Progress

---

## 📋 CONFIGURATION DECISIONS

### Data Ownership Model

✅ **Option A**: Organization-owned tasks (all members can see/edit all org tasks)

### Billing Model

✅ **Option A**: Per-organization subscriptions (no tier limits on members)

### Organization Structure

✅ **Option B**: Two-level hierarchy (Org → Teams → Members)

### Roles & Permissions

✅ **Default Clerk Roles**: `org:admin`, `org:member`

### Existing Data Migration

✅ **Option A**: Auto-create personal org for each existing user

### Collaboration Features

✅ **Phase 1**: Invite members via email  
⏳ **Future**: Team mentions, activity feed, real-time collaboration

### Multi-Workspace Support

✅ **Option A**: Users can belong to multiple organizations

---

## 🎫 IMPLEMENTATION TICKETS

---

## **PHASE 1: DATABASE SCHEMA** (Tickets 1-5)

### ✅ Ticket #1: Create Organizations Table

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: None

**Description**:
Create the core `organizations` table to store Clerk organization data.

**Schema**:

```typescript
organizations {
  id: uuid (primary key)
  clerkOrgId: text (unique, not null) // Clerk organization ID
  name: text (not null)
  slug: text (unique, not null)
  logoUrl: text (nullable)
  settings: jsonb (default '{}') // org-wide settings
  createdAt: timestamp (default now())
  updatedAt: timestamp (default now())
}
```

**Indexes**:

- `idx_orgs_clerk_id` on `clerkOrgId`
- `idx_orgs_slug` on `slug`

**Acceptance Criteria**:

- [ ] Schema defined in `/lib/db/schema.ts`
- [ ] Migration generated with `pnpm run db:generate`
- [ ] Migration applied successfully
- [ ] Drizzle types exported

---

### ✅ Ticket #2: Create Organization Memberships Table

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: Ticket #1

**Description**:
Track which users belong to which organizations and their roles.

**Schema**:

```typescript
orgMemberships {
  id: uuid (primary key)
  organizationId: uuid (FK → organizations.id, cascade delete)
  clerkUserId: text (FK → users.clerkUserId, cascade delete)
  clerkMembershipId: text (unique, not null) // Clerk membership ID
  role: text (not null) // 'org:admin' | 'org:member'
  joinedAt: timestamp (default now())
  invitedBy: text (nullable) // clerkUserId of inviter
}
```

**Indexes**:

- `idx_org_memberships_org_id` on `organizationId`
- `idx_org_memberships_user_id` on `clerkUserId`
- `idx_org_memberships_clerk_id` on `clerkMembershipId`
- Unique constraint on `(organizationId, clerkUserId)`

**Acceptance Criteria**:

- [ ] Schema defined with proper foreign keys
- [ ] Cascade delete on org/user deletion
- [ ] Migration generated and applied
- [ ] Relations defined in Drizzle

---

### ✅ Ticket #3: Create Teams Table

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: Ticket #1

**Description**:
Create teams within organizations for better organization structure.

**Schema**:

```typescript
teams {
  id: uuid (primary key)
  organizationId: uuid (FK → organizations.id, cascade delete)
  name: text (not null)
  description: text (nullable)
  color: text (nullable) // Hex color for UI
  createdBy: text (not null) // clerkUserId
  createdAt: timestamp (default now())
  updatedAt: timestamp (default now())
}
```

**Indexes**:

- `idx_teams_org_id` on `organizationId`
- Unique constraint on `(organizationId, name)`

**Acceptance Criteria**:

- [ ] Schema defined with proper foreign keys
- [ ] Cascade delete when org deleted
- [ ] Migration generated and applied
- [ ] Relations defined in Drizzle

---

### ✅ Ticket #4: Create Team Memberships Table

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: Ticket #2, Ticket #3

**Description**:
Track which users belong to which teams within an organization.

**Schema**:

```typescript
teamMemberships {
  id: uuid (primary key)
  teamId: uuid (FK → teams.id, cascade delete)
  clerkUserId: text (FK → users.clerkUserId, cascade delete)
  role: text (not null, default 'member') // 'lead' | 'member'
  joinedAt: timestamp (default now())
}
```

**Indexes**:

- `idx_team_memberships_team_id` on `teamId`
- `idx_team_memberships_user_id` on `clerkUserId`
- Unique constraint on `(teamId, clerkUserId)`

**Acceptance Criteria**:

- [ ] Schema defined with proper foreign keys
- [ ] Cascade delete on team/user deletion
- [ ] Migration generated and applied
- [ ] Relations defined in Drizzle

---

### ✅ Ticket #5: Update Tasks Table for Organization Ownership

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: Ticket #1, Ticket #3

**Description**:
Add organization and team references to tasks table for multi-tenant support.

**Schema Changes**:

```typescript
tasks {
  // ADD:
  organizationId: uuid (FK → organizations.id, nullable, cascade delete)
  teamId: uuid (FK → teams.id, nullable, set null on delete)

  // KEEP existing:
  clerkUserId (creator of task)
  // ... all other fields
}
```

**Indexes**:

- `idx_tasks_org_id` on `organizationId`
- `idx_tasks_team_id` on `teamId`
- Composite index on `(organizationId, clerkUserId)`

**Data Migration**:

- Existing tasks: `organizationId` and `teamId` stay NULL until Phase 5

**Acceptance Criteria**:

- [ ] Schema updated with new nullable fields
- [ ] Foreign keys and indexes added
- [ ] Migration generated and applied
- [ ] Existing tasks remain accessible
- [ ] No breaking changes to current functionality

---

### ✅ Ticket #6: Update User Subscriptions for Organization Billing

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: Ticket #1

**Description**:
Update subscriptions table to support both personal and organization-level billing.

**Schema Changes**:

```typescript
userSubscriptions {
  // ADD:
  organizationId: uuid (FK → organizations.id, nullable, cascade delete)
  subscriptionType: text (not null, default 'personal') // 'personal' | 'organization'

  // KEEP existing:
  clerkUserId (owner for personal, admin for org)
  // ... all other fields
}
```

**Business Logic**:

- Personal subscription: `subscriptionType = 'personal'`, `organizationId = NULL`
- Org subscription: `subscriptionType = 'organization'`, `organizationId = org.id`
- Check constraint: If `subscriptionType = 'organization'` then `organizationId IS NOT NULL`

**Indexes**:

- `idx_user_subs_org_id` on `organizationId`
- Unique constraint on `organizationId` (one subscription per org)

**Acceptance Criteria**:

- [ ] Schema updated with new fields
- [ ] Check constraints enforced
- [ ] Migration generated and applied
- [ ] Existing subscriptions stay as `personal`
- [ ] Type safety in TypeScript

---

## **PHASE 2: TYPE SYSTEM & UTILITIES** (Tickets 7-10)

### ✅ Ticket #7: Create Organization Type Definitions

**Priority**: P0 (Blocker)  
**Estimate**: 1 hour  
**Dependencies**: Tickets #1-6

**Description**:
Define centralized TypeScript types for organizations domain.

**File**: `/lib/types/organization.ts`

**Types to Define**:

```typescript
// Re-export from schema
export type { Organization, OrgMembership, Team, TeamMembership } from '@/lib/db/schema';

// Enums from schema
export const OrgRole = {
  ADMIN: 'org:admin',
  MEMBER: 'org:member',
} as const;

export type OrgRole = (typeof OrgRole)[keyof typeof OrgRole];

export const TeamRole = {
  LEAD: 'lead',
  MEMBER: 'member',
} as const;

export type TeamRole = (typeof TeamRole)[keyof typeof TeamRole];

// Extended types
export interface OrganizationWithMemberCount extends Organization {
  memberCount: number;
  teamCount: number;
}

export interface OrgMembershipWithUser extends OrgMembership {
  user: {
    clerkUserId: string;
    email: string;
    displayName: string | null;
    profileImageUrl: string | null;
  };
}

export interface TeamWithMemberCount extends Team {
  memberCount: number;
}

export interface OrgContext {
  organizationId: string;
  role: OrgRole;
  canManageOrg: boolean;
  canInviteMembers: boolean;
}
```

**Acceptance Criteria**:

- [ ] Types defined in `/lib/types/organization.ts`
- [ ] Exported from `/lib/types/index.ts`
- [ ] Re-exports schema types (no duplication)
- [ ] Follows type inference patterns from rules
- [ ] All types properly documented

---

### ✅ Ticket #8: Update Task Types for Organization Context

**Priority**: P0 (Blocker)  
**Estimate**: 1 hour  
**Dependencies**: Ticket #5, Ticket #7

**Description**:
Update task types to include organization and team context.

**File**: `/lib/types/task.ts`

**Changes**:

```typescript
// Re-export base types (ALWAYS re-export even if not extending)
export type { Task, TaskPriority } from '@/lib/db/schema';

// Extended types
export interface TaskWithOrg extends Task {
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  team?: {
    id: string;
    name: string;
    color: string | null;
  } | null;
  creator: {
    clerkUserId: string;
    email: string;
    displayName: string | null;
    profileImageUrl: string | null;
  };
}
```

**Acceptance Criteria**:

- [ ] Types updated in `/lib/types/task.ts`
- [ ] Re-exported from `/lib/types/index.ts`
- [ ] Backward compatible with existing code
- [ ] Follows centralized type patterns

---

### ✅ Ticket #9: Create Organization Utilities

**Priority**: P1 (High)  
**Estimate**: 3 hours  
**Dependencies**: Ticket #7

**Description**:
Create utility functions for organization operations.

**File**: `/lib/organizations/utils.ts`

**Utilities to Implement**:

```typescript
// Slug generation
generateOrgSlug(name: string): string

// Role checks
isOrgAdmin(role: string): boolean
canManageOrg(role: string): boolean
canInviteMembers(role: string): boolean

// Membership checks
isOrgMember(clerkUserId: string, organizationId: string): Promise<boolean>
getUserOrgRole(clerkUserId: string, organizationId: string): Promise<OrgRole | null>

// Organization retrieval
getOrgByClerkId(clerkOrgId: string): Promise<Organization | null>
getOrgsByUserId(clerkUserId: string): Promise<Organization[]>
getUserMemberships(clerkUserId: string): Promise<OrgMembershipWithUser[]>
```

**Acceptance Criteria**:

- [ ] All utility functions implemented
- [ ] Unit tests with 80%+ coverage
- [ ] Error handling for edge cases
- [ ] Proper database query optimization
- [ ] TypeScript strict mode compliance

---

### ✅ Ticket #10: Create Organization Sync Utilities

**Priority**: P0 (Blocker)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #7, Ticket #9

**Description**:
Create utilities to sync Clerk organizations with local database.

**File**: `/lib/organizations/sync.ts`

**Functions to Implement**:

```typescript
// Sync organization from Clerk
syncOrganizationFromClerk(clerkOrgId: string): Promise<Organization>

// Sync membership from Clerk
syncMembershipFromClerk(clerkMembershipId: string): Promise<OrgMembership>

// Bulk sync operations
syncAllUserOrganizations(clerkUserId: string): Promise<void>

// Webhook handlers
syncOrgFromWebhook(data: ClerkOrgWebhook): Promise<Organization>
syncMembershipFromWebhook(data: ClerkMembershipWebhook): Promise<OrgMembership>

// Cleanup operations
removeOrgMembership(clerkMembershipId: string): Promise<void>
softDeleteOrganization(organizationId: string): Promise<void>
```

**Acceptance Criteria**:

- [ ] All sync functions implemented
- [ ] Idempotent operations (safe to run multiple times)
- [ ] Error handling and logging
- [ ] Unit tests with mocked Clerk API
- [ ] Integration with activity logs

---

## **PHASE 3: CLERK WEBHOOK INTEGRATION** (Tickets 11-13)

### ✅ Ticket #11: Update Clerk Webhook Handler for Organizations

**Priority**: P0 (Blocker)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #10

**Description**:
Extend existing Clerk webhook handler to support organization events.

**File**: `/app/api/clerk/webhook/route.ts`

**New Event Handlers**:

```typescript
// Organization events
- organization.created → createOrganization()
- organization.updated → updateOrganization()
- organization.deleted → handleOrgDeletion()

// Membership events
- organizationMembership.created → addOrgMember()
- organizationMembership.updated → updateOrgMember()
- organizationMembership.deleted → removeOrgMember()

// Invitation events
- organizationInvitation.created → logInvitation()
- organizationInvitation.accepted → handleInvitationAccepted()
- organizationInvitation.revoked → handleInvitationRevoked()
```

**Acceptance Criteria**:

- [ ] All organization webhook events handled
- [ ] Webhook signature validation
- [ ] Database sync on each event
- [ ] Activity logging for audit trail
- [ ] Error handling and retries
- [ ] Unit tests with mock webhooks
- [ ] Integration tests with test Clerk events

---

### ✅ Ticket #12: Add Webhook Type Definitions

**Priority**: P1 (High)  
**Estimate**: 1 hour  
**Dependencies**: Ticket #11

**Description**:
Create TypeScript types for Clerk organization webhook payloads.

**File**: `/lib/types/webhooks.ts`

**Types to Define**:

```typescript
export interface ClerkOrganizationWebhook {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  created_at: number;
  updated_at: number;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
}

export interface ClerkMembershipWebhook {
  id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  public_user_data: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    identifier: string;
  };
  role: string;
  created_at: number;
  updated_at: number;
}

export interface ClerkWebhookEvent {
  type: string;
  object: 'event';
  data: ClerkOrganizationWebhook | ClerkMembershipWebhook | ClerkWebhookUser;
}
```

**Acceptance Criteria**:

- [ ] All webhook types defined
- [ ] Type guards implemented
- [ ] Exported from `/lib/types/index.ts`
- [ ] Used in webhook handler
- [ ] Validated against Clerk documentation

---

### ✅ Ticket #13: Test Webhook Integration

**Priority**: P1 (High)  
**Estimate**: 3 hours  
**Dependencies**: Ticket #11, Ticket #12

**Description**:
Create comprehensive tests for organization webhook handling.

**Test File**: `/__tests__/api/clerk/webhook-orgs.test.ts`

**Test Cases**:

- [ ] Organization created → database record created
- [ ] Organization updated → database record updated
- [ ] Organization deleted → soft delete performed
- [ ] Membership created → user added to org
- [ ] Membership updated → role changed
- [ ] Membership deleted → user removed from org
- [ ] Invalid webhook signature → 401 error
- [ ] Duplicate events → idempotent handling
- [ ] Missing required fields → proper error

**Acceptance Criteria**:

- [ ] All test cases passing
- [ ] Coverage > 85% for webhook handlers
- [ ] Integration tests with test database
- [ ] Mock Clerk API responses
- [ ] Test webhook signature validation

---

## **PHASE 4: tRPC ROUTER UPDATES** (Tickets 14-18)

### ✅ Ticket #14: Create Organization tRPC Router

**Priority**: P0 (Blocker)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #10

**Description**:
Create new tRPC router for organization operations.

**File**: `/lib/trpc/routers/organizations.ts`

**Procedures**:

```typescript
// Queries
- getUserOrganizations() → Get all orgs user belongs to
- getOrganization(orgId) → Get single org details
- getOrgMembers(orgId) → List all members
- getOrgTeams(orgId) → List all teams

// Mutations
- createOrganization(name, slug?) → Create new org
- updateOrganization(orgId, data) → Update org details
- deleteOrganization(orgId) → Delete org (admin only)
- inviteMember(orgId, email, role) → Send invitation
- updateMemberRole(orgId, userId, role) → Change member role
- removeMember(orgId, userId) → Remove member from org
```

**Acceptance Criteria**:

- [ ] All procedures implemented
- [ ] Input validation with Zod schemas
- [ ] Authorization checks (admin-only for mutations)
- [ ] Error handling for edge cases
- [ ] Integrated into main app router
- [ ] Unit tests for each procedure

---

### ✅ Ticket #15: Create Teams tRPC Router

**Priority**: P1 (High)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #14

**Description**:
Create tRPC router for team management within organizations.

**File**: `/lib/trpc/routers/teams.ts`

**Procedures**:

```typescript
// Queries
- getTeams(orgId) → List teams in org
- getTeam(teamId) → Get team details
- getTeamMembers(teamId) → List team members

// Mutations
- createTeam(orgId, name, description?, color?) → Create team
- updateTeam(teamId, data) → Update team
- deleteTeam(teamId) → Delete team
- addTeamMember(teamId, userId, role?) → Add member to team
- updateTeamMemberRole(teamId, userId, role) → Change role
- removeTeamMember(teamId, userId) → Remove from team
```

**Acceptance Criteria**:

- [ ] All procedures implemented
- [ ] Org membership verification before team access
- [ ] Input validation with Zod schemas
- [ ] Authorization checks
- [ ] Error handling
- [ ] Integrated into main app router
- [ ] Unit tests for each procedure

---

### ✅ Ticket #16: Update Tasks tRPC Router for Organization Context

**Priority**: P0 (Blocker)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #5, Ticket #14

**Description**:
Update existing tasks router to support organization-scoped operations.

**File**: `/lib/trpc/routers/tasks.ts`

**Changes**:

```typescript
// Update list query
list(orgId, filters?) → Filter by organizationId

// Update create mutation
create(data) → Add organizationId and teamId

// Update other mutations
update/delete → Verify org membership

// New procedures
assignToTeam(taskId, teamId) → Move task to team
unassignFromTeam(taskId) → Remove team assignment
```

**Authorization Rules**:

- User must be member of organization to view/edit org tasks
- Personal tasks (no orgId) only visible to creator
- Org admins can manage all org tasks
- Regular members can manage all org tasks (per requirement #1)

**Acceptance Criteria**:

- [ ] All procedures updated with org context
- [ ] Authorization checks implemented
- [ ] Backward compatibility for personal tasks
- [ ] Server-side filtering by organization
- [ ] Updated unit tests
- [ ] No breaking changes to existing API

---

### ✅ Ticket #17: Update tRPC Context for Organization

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: Ticket #9

**Description**:
Enhance tRPC context to include active organization context.

**File**: `/lib/trpc/init.ts`

**Changes**:

```typescript
export const createTRPCContext = async () => {
  const { userId, orgId, orgRole } = await auth();
  const user = userId ? await currentUser() : null;

  return {
    userId,
    user,
    orgId, // Active organization ID from Clerk
    orgRole, // User's role in active org
  };
};

// New middleware: Require organization context
export const orgProcedure = protectedProcedure.use(async (opts) => {
  const { ctx } = opts;

  if (!ctx.orgId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization context required',
    });
  }

  // Verify user is member of organization
  const membership = await getOrgMembership(ctx.userId, ctx.orgId);
  if (!membership) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not a member of this organization',
    });
  }

  return opts.next({
    ctx: {
      ...ctx,
      orgId: ctx.orgId,
      orgRole: ctx.orgRole,
      membership,
    },
  });
});

// New middleware: Require admin role
export const orgAdminProcedure = orgProcedure.use(async (opts) => {
  if (opts.ctx.orgRole !== 'org:admin') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Organization admin access required',
    });
  }
  return opts.next();
});
```

**Acceptance Criteria**:

- [ ] Context includes org information
- [ ] New middleware procedures defined
- [ ] Proper authorization checks
- [ ] Unit tests for middleware
- [ ] Updated exports in `/lib/trpc/init.ts`

---

### ✅ Ticket #18: Create tRPC Schemas for Organizations

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: Ticket #7

**Description**:
Create Zod validation schemas for organization operations (client-safe).

**File**: `/lib/trpc/schemas/organizations.ts`

**Schemas**:

```typescript
// Organization schemas
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
});

export const updateOrganizationSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  settings: z.record(z.unknown()).optional(),
});

// Membership schemas
export const inviteMemberSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['org:admin', 'org:member']).default('org:member'),
});

export const updateMemberRoleSchema = z.object({
  organizationId: z.string().uuid(),
  clerkUserId: z.string(),
  role: z.enum(['org:admin', 'org:member']),
});

// Team schemas
export const createTeamSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});
```

**File**: `/lib/trpc/schemas/tasks.ts` (update)

**Updated Schemas**:

```typescript
// Update existing schemas
export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.date().optional(),
  organizationId: z.string().uuid().optional(), // NEW
  teamId: z.string().uuid().optional(), // NEW
});

export const taskListFiltersSchema = z
  .object({
    completed: z.boolean().optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    searchQuery: z.string().optional(),
    organizationId: z.string().uuid().optional(), // NEW
    teamId: z.string().uuid().optional(), // NEW
  })
  .optional();
```

**Acceptance Criteria**:

- [ ] All schemas defined (client-safe, no server imports)
- [ ] Proper validation rules
- [ ] Exported from `/lib/trpc/index.ts`
- [ ] Used in router procedures
- [ ] Follows schema separation pattern

---

## **PHASE 5: DATA MIGRATION** (Tickets 19-21)

### ✅ Ticket #19: Create Personal Organizations for Existing Users

**Priority**: P0 (Blocker)  
**Estimate**: 4 hours  
**Dependencies**: Tickets #1-6, Ticket #10

**Description**:
Migrate existing users to personal organizations automatically.

**File**: `/scripts/migrate-to-orgs.ts`

**Migration Steps**:

1. Fetch all existing users from database
2. For each user:
   - Create organization in Clerk via API
   - Sync organization to local database
   - Create membership record
   - Update user's tasks with organizationId
   - Create default "General" team
   - Log migration activity

**Script Structure**:

```typescript
async function migrateUsersToOrgs() {
  const users = await db.select().from(users);

  for (const user of users) {
    try {
      // Create org in Clerk
      const clerkOrg = await clerkClient.organizations.createOrganization({
        name: `${user.displayName || user.email}'s Workspace`,
        createdBy: user.clerkUserId,
      });

      // Sync to database
      const org = await syncOrganizationFromClerk(clerkOrg.id);

      // Transfer task ownership
      await db
        .update(tasks)
        .set({ organizationId: org.id })
        .where(eq(tasks.clerkUserId, user.clerkUserId));

      // Create default team
      await createDefaultTeam(org.id, user.clerkUserId);

      console.log(`✅ Migrated user ${user.email}`);
    } catch (error) {
      console.error(`❌ Failed to migrate ${user.email}:`, error);
      // Continue with next user
    }
  }
}
```

**Safety Features**:

- Dry-run mode (preview without changes)
- Transaction support (rollback on error)
- Progress logging
- Skip already migrated users
- Backup database before running

**Acceptance Criteria**:

- [ ] Migration script completed
- [ ] Dry-run mode implemented
- [ ] Transaction safety
- [ ] Error handling and logging
- [ ] Progress tracking
- [ ] Tested on staging database
- [ ] Rollback plan documented
- [ ] All existing tasks assigned to orgs

---

### ✅ Ticket #20: Migrate User Subscriptions to Organizations

**Priority**: P0 (Blocker)  
**Estimate**: 3 hours  
**Dependencies**: Ticket #19

**Description**:
Transfer existing user subscriptions to their personal organizations.

**File**: `/scripts/migrate-subscriptions.ts`

**Migration Logic**:

```typescript
async function migrateSubscriptionsToOrgs() {
  const subscriptions = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.subscriptionType, 'personal'));

  for (const sub of subscriptions) {
    // Find user's personal organization
    const org = await findPersonalOrg(sub.clerkUserId);

    if (!org) {
      console.warn(`No org found for user ${sub.clerkUserId}`);
      continue;
    }

    // Update subscription
    await db
      .update(userSubscriptions)
      .set({
        organizationId: org.id,
        subscriptionType: 'organization',
        updatedAt: new Date(),
      })
      .where(eq(userSubscriptions.id, sub.id));

    console.log(`✅ Migrated subscription for ${sub.clerkUserId}`);
  }
}
```

**Acceptance Criteria**:

- [ ] Migration script completed
- [ ] All active subscriptions transferred
- [ ] Subscription metadata preserved
- [ ] Polar webhook handling updated
- [ ] Tested on staging
- [ ] No billing interruption
- [ ] Rollback plan ready

---

### ✅ Ticket #21: Add Migration Commands to package.json

**Priority**: P1 (High)  
**Estimate**: 1 hour  
**Dependencies**: Ticket #19, Ticket #20

**Description**:
Add npm scripts for running migration safely.

**File**: `/package.json`

**Scripts to Add**:

```json
{
  "scripts": {
    "migrate:orgs": "tsx scripts/migrate-to-orgs.ts",
    "migrate:orgs:dry": "tsx scripts/migrate-to-orgs.ts --dry-run",
    "migrate:subs": "tsx scripts/migrate-subscriptions.ts",
    "migrate:subs:dry": "tsx scripts/migrate-subscriptions.ts --dry-run",
    "migrate:all": "tsx scripts/run-all-migrations.ts"
  }
}
```

**Documentation**:
Create `/scripts/README.md` with:

- Migration order
- Safety checks
- Rollback procedures
- Troubleshooting guide

**Acceptance Criteria**:

- [ ] Scripts added to package.json
- [ ] Documentation created
- [ ] Tested locally
- [ ] Dry-run mode works
- [ ] Error handling verified

---

## **PHASE 6: BILLING INTEGRATION** (Tickets 22-24)

### ✅ Ticket #22: Update Billing Utilities for Organizations

**Priority**: P0 (Blocker)  
**Estimate**: 3 hours  
**Dependencies**: Ticket #6

**Description**:
Update billing utilities to support organization-level subscriptions.

**Files to Update**:

- `/lib/billing/subscription.ts`
- `/lib/billing/operations.ts`
- `/lib/billing/eligibility.ts`

**Key Changes**:

```typescript
// subscription.ts
export async function getOrgSubscription(organizationId: string): Promise<UserSubscription | null> {
  const [subscription] = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.organizationId, organizationId))
    .limit(1);

  return subscription || null;
}

export async function hasOrgFeatureAccess(
  organizationId: string,
  feature: string
): Promise<boolean> {
  const subscription = await getOrgSubscription(organizationId);
  // Check feature access based on subscription tier
}

// operations.ts
export async function createOrgCheckoutSession(
  organizationId: string,
  tier: 'pro' | 'business',
  createdBy: string
): Promise<{ checkoutUrl: string }> {
  // Create Polar checkout for organization
}
```

**Acceptance Criteria**:

- [ ] Organization subscription functions implemented
- [ ] Backward compatibility for personal subscriptions
- [ ] Feature gating works for orgs
- [ ] Unit tests updated
- [ ] Type safety maintained

---

### ✅ Ticket #23: Update Polar Webhook Handler for Organizations

**Priority**: P0 (Blocker)  
**Estimate**: 3 hours  
**Dependencies**: Ticket #22

**Description**:
Update Polar webhook handler to process organization subscriptions.

**File**: `/app/api/billing/webhook/route.ts`

**Updates**:

```typescript
// Handle subscription.created
async function handleSubscriptionCreated(event: PolarWebhookEvent) {
  const { customer_id, subscription_id } = event.data;

  // Determine if personal or organization subscription
  // Check metadata for organizationId

  const subscription = await createOrUpdateSubscription({
    subscriptionId: subscription_id,
    organizationId: metadata.organizationId || null,
    subscriptionType: metadata.organizationId ? 'organization' : 'personal',
    // ... other fields
  });
}
```

**Acceptance Criteria**:

- [ ] Webhook handles org subscriptions
- [ ] Metadata includes organization context
- [ ] Subscription updates propagate to all org members
- [ ] Activity logging for billing events
- [ ] Error handling and retries
- [ ] Unit tests with mock Polar events

---

### ✅ Ticket #24: Create Billing tRPC Router for Organizations

**Priority**: P1 (High)  
**Estimate**: 3 hours  
**Dependencies**: Ticket #22

**Description**:
Create tRPC procedures for organization billing operations.

**File**: `/lib/trpc/routers/billing.ts`

**Procedures**:

```typescript
// Queries
- getOrgSubscription(orgId) → Get org subscription
- getOrgBillingHistory(orgId) → Get billing history
- getAvailablePlans(orgId) → Get upgrade options

// Mutations
- createOrgCheckoutSession(orgId, tier) → Start checkout
- cancelOrgSubscription(orgId) → Cancel subscription
- reactivateOrgSubscription(orgId) → Resume subscription
```

**Authorization**:

- Only org admins can manage billing
- All members can view subscription status

**Acceptance Criteria**:

- [ ] All procedures implemented
- [ ] Admin-only authorization
- [ ] Integration with Polar API
- [ ] Error handling for payment failures
- [ ] Unit tests for each procedure
- [ ] Integrated into main router

---

## **PHASE 7: UI COMPONENTS** (Tickets 25-32)

### ✅ Ticket #25: Add Clerk Organization Components

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: Ticket #17

**Description**:
Integrate Clerk's pre-built organization UI components.

**Components to Add**:

- `<OrganizationSwitcher />` - Switch between orgs
- `<OrganizationProfile />` - Manage org settings
- `<OrganizationList />` - List user's organizations
- `<CreateOrganization />` - Create new org

**Files to Update**:

- `/components/app-sidebar.tsx` - Add org switcher
- `/app/(logged-in)/layout.tsx` - Provide org context

**Acceptance Criteria**:

- [ ] Clerk components integrated
- [ ] Styled with Shadcn theme
- [ ] Responsive design
- [ ] Dark mode support
- [ ] Accessible (WCAG 2.1 AA)

---

### ✅ Ticket #26: Create Organization Settings Page

**Priority**: P1 (High)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #14, Ticket #25

**Description**:
Create settings page for organization management.

**Route**: `/app/(logged-in)/settings/organization/page.tsx`

**Tabs**:

1. **General**: Name, slug, logo
2. **Members**: List members, invite, manage roles
3. **Teams**: Create/manage teams
4. **Billing**: Subscription management (admin only)

**Components**:

```typescript
<OrganizationSettingsLayout>
  <GeneralSettings />
  <MemberManagement />
  <TeamManagement />
  <BillingSettings />
</OrganizationSettingsLayout>
```

**Acceptance Criteria**:

- [ ] All tabs implemented
- [ ] Forms use react-hook-form + Zod
- [ ] Proper authorization checks
- [ ] Loading states with skeletons
- [ ] Error handling with toasts
- [ ] Responsive design
- [ ] Follows design rubric (score 5/5)

---

### ✅ Ticket #27: Create Invite Members Flow

**Priority**: P0 (Blocker)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #14, Ticket #26

**Description**:
Build UI for inviting members to organization via email.

**Components**:

- `InviteMemberDialog` - Modal form for sending invites
- `PendingInvitationsList` - Show pending invites
- `InvitationEmailTemplate` - Email template for invites

**Flow**:

1. Admin clicks "Invite Members"
2. Enter email address(es) and role
3. Send invitation via Clerk API
4. Clerk sends email with invite link
5. User accepts invite → webhook → sync to database

**File**: `/app/(logged-in)/settings/organization/components/invite-member-dialog.tsx`

**Acceptance Criteria**:

- [ ] Dialog component created
- [ ] Multiple email input support
- [ ] Role selection dropdown
- [ ] Integration with Clerk invitations API
- [ ] Success/error toast notifications
- [ ] Email validation
- [ ] Pending invites list
- [ ] Cancel invitation functionality

---

### ✅ Ticket #28: Update Tasks Page for Organization Context

**Priority**: P0 (Blocker)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #16, Ticket #25

**Description**:
Update tasks page to show organization-scoped tasks.

**File**: `/app/(logged-in)/tasks/page.tsx`

**Changes**:

- Get active organization from Clerk
- Filter tasks by organizationId
- Show organization/team context in task cards
- Add team filter dropdown
- Update task creation dialog with org context

**New UI Elements**:

```typescript
<TasksHeader>
  <OrganizationBreadcrumb />
  <TeamFilter />
  <CreateTaskButton />
</TasksHeader>

<TaskList>
  <TaskCard
    showOrganization={false} // Already in org context
    showTeam={true}
    showCreator={true}
  />
</TaskList>
```

**Acceptance Criteria**:

- [ ] Tasks filtered by active organization
- [ ] Team filter works correctly
- [ ] Task cards show team badges
- [ ] Create dialog includes org/team selection
- [ ] Backward compatibility for personal tasks
- [ ] Loading states with skeletons
- [ ] Empty states for no tasks

---

### ✅ Ticket #29: Create Teams Management Page

**Priority**: P1 (High)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #15, Ticket #26

**Description**:
Build dedicated page for managing teams within organization.

**Route**: `/app/(logged-in)/org/[orgId]/teams/page.tsx`

**Features**:

- List all teams in organization
- Create new team (with color picker)
- Edit team details
- Manage team members (add/remove)
- Delete team (admin only)
- View team statistics (member count, task count)

**Components**:

```typescript
<TeamsGrid>
  <TeamCard
    team={team}
    memberCount={12}
    onEdit={handleEdit}
    onDelete={handleDelete}
  />
</TeamsGrid>

<CreateTeamDialog>
  <TeamForm />
</CreateTeamDialog>

<TeamMembersDialog>
  <MemberList />
  <AddMemberButton />
</TeamMembersDialog>
```

**Acceptance Criteria**:

- [ ] Teams grid with cards
- [ ] Create/edit/delete functionality
- [ ] Color picker for team colors
- [ ] Member management per team
- [ ] Team statistics displayed
- [ ] Responsive design
- [ ] Loading and empty states
- [ ] Follows design rubric (score 5/5)

---

### ✅ Ticket #30: Update Sidebar for Organization Navigation

**Priority**: P1 (High)  
**Estimate**: 3 hours  
**Dependencies**: Ticket #25

**Description**:
Update app sidebar to show organization context and teams.

**File**: `/components/app-sidebar.tsx`

**Changes**:

```typescript
<Sidebar>
  <OrganizationSwitcher /> {/* Top of sidebar */}

  <NavMain>
    <NavItem href="/dashboard">Dashboard</NavItem>
    <NavItem href="/tasks">All Tasks</NavItem>

    <NavGroup label="Teams">
      {teams.map(team => (
        <NavItem
          key={team.id}
          href={`/tasks?team=${team.id}`}
          color={team.color}
        >
          {team.name}
        </NavItem>
      ))}
      <CreateTeamButton />
    </NavGroup>

    <NavItem href="/settings/organization">Settings</NavItem>
  </NavMain>
</Sidebar>
```

**Acceptance Criteria**:

- [ ] Organization switcher at top
- [ ] Teams section with dynamic list
- [ ] Team colors displayed
- [ ] Quick team creation
- [ ] Active state styling
- [ ] Responsive collapse behavior
- [ ] Smooth transitions

---

### ✅ Ticket #31: Create Organization Dashboard Page

**Priority**: P1 (High)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #14, Ticket #15

**Description**:
Create dashboard showing organization overview and statistics.

**Route**: `/app/(logged-in)/dashboard/page.tsx` (update)

**Widgets**:

- Organization overview (name, member count, team count)
- Recent activity feed
- Task statistics by team
- Member activity leaderboard
- Quick actions (invite member, create team, etc.)

**Layout**:

```typescript
<DashboardGrid>
  <OrgOverviewCard />
  <TaskStatisticsCard />
  <RecentActivityCard />
  <MemberActivityCard />
  <QuickActionsCard />
</DashboardGrid>
```

**Acceptance Criteria**:

- [ ] All widgets implemented
- [ ] Real-time statistics from tRPC
- [ ] Charts using Shadcn charts
- [ ] Responsive grid layout
- [ ] Loading skeletons
- [ ] Empty states
- [ ] Follows design rubric (score 5/5)

---

### ✅ Ticket #32: Create Onboarding Flow for Organizations

**Priority**: P1 (High)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #25, Ticket #27

**Description**:
Create guided onboarding flow for new organizations.

**Trigger**: First login after migration OR creating new org

**Steps**:

1. Welcome to your organization
2. Invite team members (optional)
3. Create your first team (optional)
4. Create your first task (optional)
5. Tour complete → redirect to dashboard

**Component**: `/components/onboarding-wizard.tsx`

**Acceptance Criteria**:

- [ ] Multi-step wizard implemented
- [ ] Skip and "Do this later" options
- [ ] Progress indicator
- [ ] Animations and transitions
- [ ] Stored completion state (don't show again)
- [ ] Responsive design
- [ ] Accessible keyboard navigation

---

## **PHASE 8: TESTING & DOCUMENTATION** (Tickets 33-36)

### ✅ Ticket #33: Write Unit Tests for Organization Utilities

**Priority**: P1 (High)  
**Estimate**: 4 hours  
**Dependencies**: Ticket #9, Ticket #10

**Description**:
Comprehensive unit tests for organization utility functions.

**Files**:

- `/__tests__/lib/organizations/utils.test.ts`
- `/__tests__/lib/organizations/sync.test.ts`

**Test Coverage**:

- [ ] Slug generation (unique, valid format)
- [ ] Role checking functions
- [ ] Membership verification
- [ ] Organization retrieval
- [ ] Sync operations (idempotency)
- [ ] Error handling
- [ ] Edge cases (null values, empty strings)

**Target**: 90%+ coverage

**Acceptance Criteria**:

- [ ] All utility functions tested
- [ ] Mock database operations
- [ ] Mock Clerk API calls
- [ ] Coverage > 90%
- [ ] All tests passing

---

### ✅ Ticket #34: Write Integration Tests for tRPC Routers

**Priority**: P1 (High)  
**Estimate**: 6 hours  
**Dependencies**: Tickets #14-18

**Description**:
End-to-end tests for organization and team tRPC procedures.

**Files**:

- `/__tests__/lib/trpc/routers/organizations.test.ts`
- `/__tests__/lib/trpc/routers/teams.test.ts`
- `/__tests__/lib/trpc/routers/tasks-org.test.ts`

**Test Scenarios**:

- [ ] Create organization → verify database record
- [ ] Invite member → verify membership created
- [ ] Update member role → verify role changed
- [ ] Create team → verify team and membership
- [ ] Filter tasks by organization
- [ ] Authorization failures (non-admin, non-member)
- [ ] Error cases (invalid input, missing org)

**Acceptance Criteria**:

- [ ] All routers tested
- [ ] Test database setup/teardown
- [ ] Mock Clerk context
- [ ] Authorization tested
- [ ] Coverage > 85%
- [ ] All tests passing

---

### ✅ Ticket #35: Write E2E Tests for Organization Flows

**Priority**: P2 (Medium)  
**Estimate**: 6 hours  
**Dependencies**: Tickets #25-32

**Description**:
End-to-end tests using Playwright for user-facing organization features.

**Test File**: `/e2e/organizations.spec.ts`

**Scenarios**:

- [ ] User creates new organization
- [ ] Admin invites member via email
- [ ] Member accepts invitation
- [ ] User switches between organizations
- [ ] Admin creates team
- [ ] Admin adds member to team
- [ ] User creates task in organization
- [ ] User filters tasks by team
- [ ] Admin manages organization billing
- [ ] Admin removes member from organization

**Acceptance Criteria**:

- [ ] All critical flows tested
- [ ] Tests run in CI/CD
- [ ] Screenshots on failure
- [ ] Test isolation (no shared state)
- [ ] All tests passing

---

### ✅ Ticket #36: Update Documentation

**Priority**: P1 (High)  
**Estimate**: 4 hours  
**Dependencies**: All previous tickets

**Description**:
Update project documentation for organization features.

**Files to Update/Create**:

1. `/README.md` - Add organization features section
2. `/docs/ORGANIZATIONS.md` - Complete organization guide
3. `/docs/MIGRATION.md` - Migration guide for existing users
4. `/docs/API.md` - Updated API reference
5. `/lib/trpc/README.md` - tRPC router documentation

**Documentation Sections**:

- Overview of organization features
- User roles and permissions
- How to create and manage organizations
- Team management guide
- Billing for organizations
- API reference for developers
- Migration guide (existing users)
- Troubleshooting common issues

**Acceptance Criteria**:

- [ ] All documentation files created/updated
- [ ] Code examples included
- [ ] Screenshots/diagrams added
- [ ] Markdown properly formatted
- [ ] Links verified
- [ ] Reviewed by team

---

## **PHASE 9: DEPLOYMENT** (Tickets 37-40)

### ✅ Ticket #37: Update Environment Variables

**Priority**: P0 (Blocker)  
**Estimate**: 1 hour  
**Dependencies**: None

**Description**:
Add required environment variables for organization features.

**Files**:

- `.env.example`
- Production environment (Vercel)

**New Variables**:

```bash
# Clerk Organization Settings
CLERK_ORGANIZATIONS_ENABLED=true
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard

# Feature Flags
NEXT_PUBLIC_ENABLE_TEAMS=true
NEXT_PUBLIC_ENABLE_ORG_BILLING=true
```

**Acceptance Criteria**:

- [ ] `.env.example` updated
- [ ] Production env vars configured
- [ ] Staging env vars configured
- [ ] Documentation updated

---

### ✅ Ticket #38: Run Database Migration in Production

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: Tickets #1-6

**Description**:
Apply database schema migrations to production safely.

**Steps**:

1. Backup production database
2. Test migrations on staging
3. Schedule maintenance window
4. Apply migrations to production
5. Verify database integrity
6. Monitor for errors

**Commands**:

```bash
# Backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Apply migrations
pnpm run db:migrate:prod

# Verify
pnpm run db:studio
```

**Rollback Plan**:

```bash
# Restore from backup if needed
psql $DATABASE_URL < backup_20251001.sql
```

**Acceptance Criteria**:

- [ ] Backup completed
- [ ] Migrations tested on staging
- [ ] Production migration successful
- [ ] No data loss
- [ ] Application functional
- [ ] Rollback plan tested

---

### ✅ Ticket #39: Run Data Migration Script

**Priority**: P0 (Blocker)  
**Estimate**: 3 hours  
**Dependencies**: Ticket #19, Ticket #20, Ticket #38

**Description**:
Execute data migration to create personal organizations for existing users.

**Pre-Flight Checks**:

- [ ] Database backup completed
- [ ] Staging migration successful
- [ ] Dry-run completed without errors
- [ ] Team notified

**Execution**:

```bash
# Dry run first
pnpm run migrate:orgs:dry

# Review output, then run for real
pnpm run migrate:orgs

# Migrate subscriptions
pnpm run migrate:subs
```

**Monitoring**:

- Watch error logs
- Track progress
- Monitor database performance
- Check Clerk API rate limits

**Acceptance Criteria**:

- [ ] All users migrated to personal orgs
- [ ] All tasks assigned to organizations
- [ ] All subscriptions transferred
- [ ] No data loss
- [ ] Activity logs created
- [ ] Verification queries pass

---

### ✅ Ticket #40: Deploy to Production

**Priority**: P0 (Blocker)  
**Estimate**: 2 hours  
**Dependencies**: All previous tickets

**Description**:
Deploy organization features to production.

**Deployment Checklist**:

- [ ] All tests passing in CI/CD
- [ ] Code reviewed and approved
- [ ] Database migrations completed
- [ ] Data migration completed
- [ ] Environment variables configured
- [ ] Staging deployment successful
- [ ] Performance testing completed
- [ ] Security audit passed

**Steps**:

1. Merge feature branch to main
2. Vercel auto-deploys to production
3. Run smoke tests
4. Monitor error tracking (Sentry)
5. Monitor performance metrics
6. Verify webhooks working
7. Test critical user flows

**Rollback Plan**:

- Revert deployment in Vercel
- Restore database from backup if needed
- Notify users of any issues

**Acceptance Criteria**:

- [ ] Production deployment successful
- [ ] All features working as expected
- [ ] No critical errors in Sentry
- [ ] Performance metrics acceptable
- [ ] Webhooks processing correctly
- [ ] User testing confirms functionality

---

## 📊 PROGRESS TRACKING

### Phase Summary

| Phase                    | Tickets        | Status          | Completion |
| ------------------------ | -------------- | --------------- | ---------- |
| Phase 1: Database Schema | #1-6           | 🔄 In Progress  | 0/6        |
| Phase 2: Type System     | #7-10          | ⏳ Pending      | 0/4        |
| Phase 3: Webhooks        | #11-13         | ⏳ Pending      | 0/3        |
| Phase 4: tRPC Routers    | #14-18         | ⏳ Pending      | 0/5        |
| Phase 5: Data Migration  | #19-21         | ⏳ Pending      | 0/3        |
| Phase 6: Billing         | #22-24         | ⏳ Pending      | 0/3        |
| Phase 7: UI Components   | #25-32         | ⏳ Pending      | 0/8        |
| Phase 8: Testing & Docs  | #33-36         | ⏳ Pending      | 0/4        |
| Phase 9: Deployment      | #37-40         | ⏳ Pending      | 0/4        |
| **TOTAL**                | **40 Tickets** | **0% Complete** | **0/40**   |

### Risk Assessment

| Risk Level | Count | Tickets                                         |
| ---------- | ----- | ----------------------------------------------- |
| 🔴 High    | 6     | #6, #19, #20, #38, #39, #40                     |
| 🟡 Medium  | 10    | #5, #11, #16, #22, #23, #26, #27, #28, #34, #35 |
| 🟢 Low     | 24    | All others                                      |

---

## 📝 NOTES

### Breaking Changes

- Task API now requires organization context for new tasks
- Billing endpoints moved from user-level to org-level
- URL structure changed for organization routes

### Backward Compatibility

- Personal tasks (no orgId) remain supported
- Personal subscriptions still work
- Existing webhooks continue functioning
- Gradual migration strategy prevents service interruption

### Performance Considerations

- Added indexes on all foreign keys
- Composite indexes for common query patterns
- Query optimization for org-scoped data
- Caching strategy for permission checks

### Security Considerations

- Row-level access control via tRPC middleware
- Clerk handles authentication and org membership
- Activity logging for audit trail
- Rate limiting on invite endpoints

---

## 🚀 GETTING STARTED

To begin implementation:

```bash
# Checkout feature branch
git checkout -b feat/organizations-migration

# Install dependencies (if needed)
pnpm install

# Start local development
pnpm run dev

# Open database studio
pnpm run db:studio
```

Start with **Phase 1: Ticket #1** and proceed sequentially.

---

**Last Updated**: October 1, 2025  
**Document Version**: 1.0  
**Maintained By**: Development Team
