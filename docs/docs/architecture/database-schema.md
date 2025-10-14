---
sidebar_position: 3
---

# Database Schema

Understanding Kosuke Template's PostgreSQL database structure and relationships.

## Core Tables

### users

Synced from Clerk via webhooks.

```typescript
{
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').unique().notNull(),
  email: text('email').notNull(),
  username: text('username'),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}
```

### organizations

Multi-tenant workspaces.

```typescript
{
  id: serial('id').primaryKey(),
  clerkOrganizationId: text('clerk_organization_id').unique().notNull(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  imageUrl: text('image_url'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}
```

### organizationMemberships

User-organization relationships.

```typescript
{
  id: serial('id').primaryKey(),
  clerkMembershipId: text('clerk_membership_id').unique().notNull(),
  userId: integer('user_id').references(() => users.id),
  organizationId: integer('organization_id').references(() => organizations.id),
  role: text('role').notNull(), // 'admin' | 'member'
  createdAt: timestamp('created_at').defaultNow(),
}
```

### userSubscriptions

Billing subscriptions.

```typescript
{
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').references(() => users.clerkUserId),
  tier: tierEnum('tier').notNull(), // 'free' | 'pro' | 'business'
  polarSubscriptionId: text('polar_subscription_id').unique(),
  status: text('status').notNull(), // 'active' | 'canceled' | 'incomplete'
  currentPeriodEnd: timestamp('current_period_end'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}
```

## Enums

### Subscription Tier

```typescript
export const tierEnum = pgEnum('tier', ['free', 'pro', 'business']);
export type SubscriptionTier = (typeof tierEnum.enumValues)[number];
```

## Relationships

### User Relationships

```
users (1) ─── (N) organizationMemberships ─── (1) organizations
users (1) ─── (1) userSubscriptions
```

### Organization Relationships

```
organizations (1) ─── (N) organizationMemberships
```

## Indexes

For optimal query performance:

```sql
-- User lookups by Clerk ID
CREATE UNIQUE INDEX idx_users_clerk_id ON users(clerk_user_id);

-- Organization lookups
CREATE UNIQUE INDEX idx_orgs_clerk_id ON organizations(clerk_organization_id);
CREATE UNIQUE INDEX idx_orgs_slug ON organizations(slug);

-- Membership queries
CREATE INDEX idx_memberships_user ON organization_memberships(user_id);
CREATE INDEX idx_memberships_org ON organization_memberships(organization_id);

-- Subscription lookups
CREATE UNIQUE INDEX idx_subs_polar_id ON user_subscriptions(polar_subscription_id);
```

## Migrations

### Creating Migrations

```bash
# 1. Modify schema in lib/db/schema.ts
# 2. Generate migration
pnpm run db:generate

# 3. Review migration in lib/db/migrations/
# 4. Apply migration
pnpm run db:migrate
```

### Migration Files

Located in `lib/db/migrations/`:

- SQL files with timestamps
- Automatic up/down migrations
- Version controlled

## Type Safety

### Drizzle Type Inference

```typescript
// Infer types from schema
import { users, organizations } from '@/lib/db/schema';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Select model (what you get from queries)
export type User = InferSelectModel<typeof users>;

// Insert model (what you pass to inserts)
export type NewUser = InferInsertModel<typeof users>;
```

### Using Types

```typescript
import type { User } from '@/lib/types';

function UserProfile({ user }: { user: User }) {
  return <div>{user.email}</div>;
}
```

## Querying

### Basic Queries

```typescript
import { db } from '@/lib/db/drizzle';
import { users, organizations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Select user by Clerk ID
const user = await db.select().from(users).where(eq(users.clerkUserId, clerkId)).limit(1);

// Get user's organizations
const userOrgs = await db
  .select()
  .from(organizationMemberships)
  .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
  .where(eq(organizationMemberships.userId, userId));
```

### Complex Queries

```typescript
// User with subscription
const userWithSub = await db
  .select({
    user: users,
    subscription: userSubscriptions,
  })
  .from(users)
  .leftJoin(userSubscriptions, eq(users.clerkUserId, userSubscriptions.clerkUserId))
  .where(eq(users.id, userId))
  .limit(1);
```

## Best Practices

### 1. Always Use Indexes

```typescript
// ✅ Good: Indexed column
.where(eq(users.clerkUserId, id))

// ❌ Slow: Non-indexed column
.where(eq(users.email, email))
```

### 2. Limit Results

```typescript
// ✅ Good: Always limit
.select().from(users).limit(100)

// ❌ Dangerous: No limit
.select().from(users) // Could return millions
```

### 3. Use Transactions

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values(newUser);
  await tx.insert(userSubscriptions).values(newSub);
});
```

### 4. Handle NULL Values

```typescript
// Use nullable() for optional fields
imageUrl: text('image_url').nullable();
```

## Data Synchronization

### Clerk Webhooks → Database

```
Clerk Event → Webhook → Database Update
```

Events synced:

- `user.created` → Insert user
- `user.updated` → Update user
- `user.deleted` → Soft delete user
- `organization.*` → Organization CRUD
- `organizationMembership.*` → Membership CRUD

### Polar Webhooks → Database

```
Polar Event → Webhook → Subscription Update
```

Events synced:

- `subscription.created` → Create subscription
- `subscription.updated` → Update subscription
- `subscription.canceled` → Cancel subscription

## Database Management

### Drizzle Studio

Visual database browser:

```bash
pnpm run db:studio
```

Features:

- Browse tables
- Edit records
- Run queries
- View relationships

### Direct SQL

For complex operations:

```typescript
await db.execute(sql`
  UPDATE users
  SET updated_at = NOW()
  WHERE created_at < NOW() - INTERVAL '1 year'
`);
```

## Backup Strategy

### Neon Backups

- Automatic point-in-time restore (7 days)
- Database branching for testing
- Manual backups via `pg_dump`

### Manual Backup

```bash
pg_dump $POSTGRES_URL > backup.sql
```

## Next Steps

Learn about authentication:

👉 **[Authentication Flow](./authentication-flow)**

---

**Questions?** Check the [Reference](../reference/commands) section.
