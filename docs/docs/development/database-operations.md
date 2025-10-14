---
sidebar_position: 3
---

# Database Operations

Working with the database in Kosuke Template using Drizzle ORM.

## Daily Operations

### Start Database

```bash
# Start PostgreSQL container
docker-compose up -d postgres

# Verify running
docker-compose ps
```

### Stop Database

```bash
# Stop PostgreSQL
docker-compose stop postgres

# Stop and remove
docker-compose down
```

## Schema Management

### Modifying Schema

```typescript
// 1. Edit lib/db/schema.ts
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  completed: boolean('completed').default(false),
  userId: text('user_id').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Generate Migration

```bash
# Generate SQL migration
pnpm run db:generate

# You'll be prompted for migration name
? Migration name: add_tasks_table
```

### Review Migration

Check generated SQL in `lib/db/migrations/`:

```sql
-- Migration: 0001_add_tasks_table.sql
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" serial PRIMARY KEY,
  "title" text NOT NULL,
  "completed" boolean DEFAULT false,
  "user_id" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);
```

### Apply Migration

```bash
# Run migrations
pnpm run db:migrate

# Migrations are idempotent - safe to run multiple times
```

## Drizzle Studio

### Launch Studio

```bash
pnpm run db:studio
```

Visit [https://local.drizzle.studio](https://local.drizzle.studio)

### Features

- Browse all tables
- Edit records
- Add new records
- Delete records
- View relationships
- Run custom queries

## Common Operations

### Querying

```typescript
import { db } from '@/lib/db/drizzle';
import { users, organizations } from '@/lib/db/schema';
import { eq, and, like } from 'drizzle-orm';

// Select all
const allUsers = await db.select().from(users);

// Select with filter
const user = await db.select().from(users).where(eq(users.clerkUserId, userId)).limit(1);

// Search
const searchResults = await db.select().from(users).where(like(users.email, '%example.com%'));
```

### Inserting

```typescript
// Insert single record
const newUser = await db
  .insert(users)
  .values({
    clerkUserId: 'user_123',
    email: 'user@example.com',
  })
  .returning();

// Insert multiple
await db.insert(users).values([
  { clerkUserId: 'user_1', email: 'user1@example.com' },
  { clerkUserId: 'user_2', email: 'user2@example.com' },
]);
```

### Updating

```typescript
// Update record
await db.update(users).set({ email: 'newemail@example.com' }).where(eq(users.id, userId));

// Update with timestamp
await db
  .update(users)
  .set({
    email: 'newemail@example.com',
    updatedAt: new Date(),
  })
  .where(eq(users.id, userId));
```

### Deleting

```typescript
// Delete record
await db.delete(users).where(eq(users.id, userId));

// Soft delete (recommended)
await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId));
```

## Seeding Data

### Create Seed Script

```typescript
// lib/db/seed.ts
import { db } from './drizzle';
import { users } from './schema';

async function seed() {
  await db.insert(users).values([
    {
      clerkUserId: 'test_user_1',
      email: 'test@example.com',
    },
  ]);

  console.log('✅ Database seeded');
}

seed().catch(console.error);
```

### Run Seed

```bash
pnpm run db:seed
```

## Backup & Restore

### Backup Database

```bash
# Export to SQL file
pg_dump $POSTGRES_URL > backup.sql

# Or use Neon dashboard
# Projects → [Your Project] → Backups
```

### Restore Database

```bash
# Restore from SQL file
psql $POSTGRES_URL < backup.sql
```

## Performance Optimization

### Add Indexes

```typescript
// In schema
export const tasks = pgTable(
  'tasks',
  {
    // ... columns
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    completedIdx: index('completed_idx').on(table.completed),
  })
);
```

### Query Optimization

```typescript
// ✅ Good: Use indexes
.where(eq(tasks.userId, userId))

// ✅ Good: Limit results
.limit(100)

// ✅ Good: Select specific columns
.select({ id: tasks.id, title: tasks.title })

// ❌ Bad: Select all without limit
.select().from(tasks)
```

## Transactions

### Use for Multiple Operations

```typescript
await db.transaction(async (tx) => {
  // All or nothing
  await tx.insert(users).values(newUser);
  await tx.insert(userSubscriptions).values(newSub);

  // If any fails, all rollback
});
```

## Reset Database

### Development Only

```bash
# ⚠️ Destroys all data
docker-compose down -v
docker-compose up -d postgres
pnpm run db:migrate
pnpm run db:seed
```

## Next Steps

Learn about email development:

👉 **[Email Development](./email-development)**
