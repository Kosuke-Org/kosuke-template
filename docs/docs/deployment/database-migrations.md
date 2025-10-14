---
sidebar_position: 2
---

# Database Migrations

Managing database schema changes with Drizzle ORM migrations.

## How Migrations Work

### Development Workflow

```
1. Edit schema → 2. Generate migration → 3. Review SQL → 4. Apply migration
```

### Production Workflow

```
Git push → Vercel build → prebuild script → Migrations → Build → Deploy
```

## Generating Migrations

### Step 1: Modify Schema

Edit `lib/db/schema.ts`:

```typescript
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  // Add new column
  priority: text('priority').default('medium'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Step 2: Generate Migration

```bash
pnpm run db:generate
```

Drizzle detects changes and generates SQL.

### Step 3: Review Migration

Check generated SQL in `lib/db/migrations/`:

```sql
-- 0001_add_priority_column.sql
ALTER TABLE "tasks" ADD COLUMN "priority" text DEFAULT 'medium';
```

### Step 4: Apply Migration

```bash
# Local
pnpm run db:migrate

# Production (automatic via prebuild)
git push
```

## Migration Commands

```bash
# Generate migration from schema changes
pnpm run db:generate

# Apply pending migrations
pnpm run db:migrate

# Apply with verbose output (production)
pnpm run db:migrate:prod

# Push schema directly (dev only, skip migrations)
pnpm run db:push
```

## Automatic Migrations

### On Every Deployment

Migrations run automatically via `prebuild` script:

```json
{
  "scripts": {
    "prebuild": "pnpm run db:migrate"
  }
}
```

This ensures:

- Schema always matches code
- No manual migration steps
- Safe for preview branches

## Preview Branches

### Automatic Database Branching

Neon creates database branches for PRs:

```
PR opened → Neon branch created → Migrations run → Test changes
PR closed → Neon branch deleted → Clean up
```

Benefits:

- Isolated testing
- No shared state
- Safe migrations
- Automatic cleanup

## Migration Best Practices

### 1. Make Migrations Reversible

```sql
-- Add column with default
ALTER TABLE "tasks" ADD COLUMN "priority" text DEFAULT 'medium';

-- Can be reversed with
ALTER TABLE "tasks" DROP COLUMN "priority";
```

### 2. Handle Existing Data

```sql
-- Add non-nullable column in two steps
-- Step 1: Add nullable
ALTER TABLE "tasks" ADD COLUMN "priority" text;

-- Step 2: Set default for existing
UPDATE "tasks" SET "priority" = 'medium' WHERE "priority" IS NULL;

-- Step 3: Make non-nullable (in next migration)
ALTER TABLE "tasks" ALTER COLUMN "priority" SET NOT NULL;
```

### 3. Test Migrations Locally

```bash
# 1. Generate migration
pnpm run db:generate

# 2. Test locally
pnpm run db:migrate

# 3. Verify in Drizzle Studio
pnpm run db:studio

# 4. Commit and push
git add . && git commit -m "migration: add priority column"
```

## Troubleshooting

### Migration Fails

**Check migration SQL**:

```bash
cat lib/db/migrations/0001_*.sql
```

**Common issues**:

- Syntax errors
- Missing defaults for NOT NULL
- Foreign key constraints
- Duplicate column names

### Migration Out of Sync

Reset local database (dev only):

```bash
docker-compose down -v
docker-compose up -d postgres
pnpm run db:migrate
```

### Production Migration Fails

1. Check Vercel build logs
2. Verify `POSTGRES_URL` is set
3. Test migration locally
4. Fix issue and redeploy

## Advanced Migrations

### Data Transformations

```typescript
// Custom migration with data transformation
import { db } from './drizzle';
import { sql } from 'drizzle-orm';

await db.execute(sql`
  UPDATE users
  SET email = LOWER(email)
  WHERE email != LOWER(email);
`);
```

### Indexes

```typescript
// Add index for performance
export const tasks = pgTable(
  'tasks',
  {
    userId: text('user_id').notNull(),
    // ...
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
  })
);
```

### Foreign Keys

```typescript
export const tasks = pgTable('tasks', {
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});
```

## Migration History

View all migrations:

```bash
ls -la lib/db/migrations/
```

Each migration file:

- Timestamp prefix
- Descriptive name
- SQL statements

## Rollback Strategy

### For Small Changes

Create new migration to reverse:

```sql
-- Original
ALTER TABLE "tasks" ADD COLUMN "priority" text;

-- Rollback (new migration)
ALTER TABLE "tasks" DROP COLUMN "priority";
```

### For Major Changes

1. Backup database before migration
2. Test migration on backup
3. Deploy during maintenance window
4. Have rollback script ready

## Next Steps

Learn about environment setup:

👉 **[Environment Setup](./environment-setup)**
