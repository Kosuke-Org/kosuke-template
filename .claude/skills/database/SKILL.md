---
name: database
description: Drizzle ORM and PostgreSQL reference - schema conventions, pgEnum and inferred types, the db:generate/migrate/push/seed/reset workflow, and the mandatory schema-to-seed synchronization rules with faker. Load when editing lib/db/schema.ts, writing a migration, or touching the seed scripts.
---

# Database (Drizzle + PostgreSQL)

## Commands

```bash
bun run db:generate           # Generate migrations after schema changes
bun run db:migrate            # Apply migrations
bun run db:push               # Push schema (prototyping only)
bun run db:seed               # Seed database
bun run db:reset              # Reset database
bun run db:studio             # Open Drizzle Studio
bun run db:create-admin-user  # Create an admin user
```

PostgreSQL runs on port **54321** locally via Docker Compose. In `docker-compose.yml` always load variables with `env_file: - .env`; never hardcode them in the `environment:` block.

- **Schema Management**: Always use Drizzle schema definitions in `./lib/db/schema.ts`
- **Migrations**: Generate migrations with `bun run db:generate` after schema changes
- **Type Safety**: Use `createInsertSchema` and `createSelectSchema` from drizzle-zod
- **Enums**: Use `pgEnum` for enum types - provides type safety AND database-level validation
- **Type Inference**: Export inferred types from schema enums for automatic type sync
- **Relations**: Define proper relations for complex queries
- **Connection**: Use the configured database instance from `./lib/db/drizzle.ts`
- **Environment**: PostgreSQL runs on port 54321 locally via Docker Compose
- **Avoid JSONB Fields**: NEVER use JSONB fields unless absolutely necessary. Prefer proper relational design with dedicated columns and foreign keys. JSONB should only be used for truly dynamic, unstructured data that cannot be modeled with proper schema. This maintains type safety, query performance, and database integrity.
- **Database Indexes**: NEVER create database indexes unless explicitly requested by the user. Indexes should be added intentionally based on actual performance needs, not automatically. Keep schema changes minimal and focused on the required functionality.

```typescript
// Example schema pattern with enum
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Example query pattern
import { db } from '@/lib/db/drizzle';

import { users } from './schema';

// Import users table for reference

// Define enum at database level
export const statusEnum = pgEnum('status', ['pending', 'active', 'completed']);

export const tableName = pgTable('table_name', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: statusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Export inferred type - automatically syncs with enum values
export type Status = (typeof statusEnum.enumValues)[number];

const result = await db.select().from(tableName).where(eq(tableName.userId, userId));
```

### Schema and Seed Synchronization (MANDATORY)

**Whenever the database schema file (@schema.ts) is updated, the seed file MUST be updated accordingly.**

This rule applies to any project using Drizzle ORM with a seed script for development/testing data.

**Exception:** Admin-related schema changes do not require seed file updates.

#### **Why This Matters:**

- Schema and seed files must stay in sync to prevent runtime errors
- Seed scripts should generate data that respects all schema constraints
- Changes to table structures, enums, or constraints require corresponding seed updates
- Outdated seed data can cause migration failures or inconsistent test environments

#### **When to Update Seed Files:**

| Schema Change         | Required Seed Update                             |
| --------------------- | ------------------------------------------------ |
| Add new table         | Create seed data for the new table               |
| Add NOT NULL column   | Update all seeds to include the new column       |
| Add nullable column   | Optionally include in seed data                  |
| Add/modify enum       | Use updated enum values in seed data             |
| Add foreign key       | Ensure seed data maintains referential integrity |
| Add unique constraint | Ensure seed data has unique values               |
| Add check constraint  | Ensure seed data passes constraint validation    |
| Change default value  | Update seeds to reflect new defaults             |
| Rename column         | Update all column references in seeds            |
| Delete column         | Remove column from all seed data                 |
| Change data type      | Adjust seed data to match new type               |

#### **Validation Workflow:**

After any schema change, follow this workflow:

1. Update @schema.ts with changes
2. Generate migration using your ORM tool
3. **Immediately update seed file** with corresponding changes
4. Test seed script to verify it runs without errors
5. Verify seed data respects all constraints

#### **Best Practices:**

- **Realistic Data**: Use realistic, representative seed data that mirrors production patterns. Use faker library
- **Referential Integrity**: Maintain proper relationships between tables
- **Edge Cases**: Include boundary values (min/max) and optional field scenarios
- **Consistent Patterns**: Follow naming conventions and data generation patterns
- **Documentation**: Comment complex seeding logic for future maintainability
- **Type Safety**: Use inferred types from schema for type-safe seed data

**✅ CORRECT - Synchronized schema and seed:**

```typescript
// seed.ts - Updated accordingly with faker for realistic data
import { faker } from '@faker-js/faker';

// schema.ts - Added new enum and field
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high', 'urgent']);
export type Priority = (typeof priorityEnum.enumValues)[number];

export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  priority: priorityEnum('priority').notNull().default('medium'), // NEW FIELD
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

const priorities: Array<'low' | 'medium' | 'high' | 'urgent'> = ['low', 'medium', 'high', 'urgent'];

const itemValues: (typeof items.$inferInsert)[] = Array.from({ length: 10 }, (_, i) => ({
  name: faker.commerce.productName(), // NEW FIELD - realistic product names
  priority: priorities[i % 4], // NEW FIELD - rotating through enum values
}));

await db.insert(items).values(itemValues);
```

**❌ WRONG - Schema updated but seed not synchronized:**

```typescript
// schema.ts - Added new required field
export const items = pgTable('items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  priority: priorityEnum('priority').notNull().default('medium'), // NEW FIELD
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// seed.ts - Missing new field (WRONG!)
const itemValues = [
  { name: 'Item 1' }, // ❌ Missing 'priority' field
  { name: 'Item 2' }, // ❌ Will fail or only use default value
  { name: 'Item 3' }, // ❌ No variation in test data
];

await db.insert(items).values(itemValues);
```

#### **Common Pitfalls:**

- ❌ Forgetting to update seed after adding NOT NULL columns
- ❌ Using outdated enum values that no longer exist
- ❌ Breaking foreign key constraints with invalid references
- ❌ Creating duplicate values that violate unique constraints
- ❌ Using wrong data types that cause type errors
- ❌ Ignoring new validation rules (min/max, regex patterns)

#### **Type-Safe Seeding:**

Always use inferred types from your schema to ensure type safety and use faker for realistic data:

```typescript
// ✅ CORRECT - Type-safe seed data with faker
import { faker } from '@faker-js/faker';
import { items, type Priority } from './schema';

const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];

const itemValues: (typeof items.$inferInsert)[] = Array.from({ length: 20 }, (_, i) => ({
  name: faker.commerce.productName(), // Realistic product names
  priority: priorities[i % priorities.length] as Priority, // Type-checked enum values
}));

// ❌ WRONG - No type safety or faker usage
const itemValues = [
  {
    name: 'Item 1', // Static, unrealistic data
    priority: 'invalid-value', // Type error not caught!
  },
];
```
