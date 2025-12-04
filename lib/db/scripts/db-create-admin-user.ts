#!/usr/bin/env tsx
/**
 * Database Create Admin User Script
 *
 * This script creates an admin user in the database.
 *
 * Usage: bun run db:create-admin-user --email=<email>
 */
import { eq } from 'drizzle-orm';
import { ZodError, z } from 'zod';

import { db } from '@/lib/db/drizzle';
import { users } from '@/lib/db/schema';

const emailSchema = z.email();

async function main() {
  if (process.argv.length !== 3) {
    console.error('Usage: bun run db:create-admin-user --email=<email>');
    process.exit(1);
  }

  const emailArg = process.argv[2];

  if (!emailArg.startsWith('--email=')) {
    console.error('Invalid format. Use: bun run db:create-admin-user --email=<email>');
    process.exit(1);
  }

  const emailValue = emailArg.replace('--email=', '');
  const email = emailSchema.parse(emailValue);

  const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (existingUser) {
    if (existingUser.isAdmin) {
      console.log(`User with email ${email} is already an admin. Skipping...`);
      process.exit(0);
    }

    console.log(`User with email ${email} already exists. Updating to admin...`);

    const [user] = await db
      .update(users)
      .set({ isAdmin: true })
      .where(eq(users.email, email))
      .returning({ email: users.email });

    console.log(`Admin user updated: ${user.email}`);
    return;
  }

  console.log(`Creating admin user with email ${email}...`);

  const [user] = await db
    .insert(users)
    .values({
      email,
      displayName: email,
      isAdmin: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ email: users.email });

  console.log(`Admin user created: ${user.email}`);
}

main()
  .catch((error) => {
    if (error instanceof ZodError) {
      console.error(z.treeifyError(error).errors.join('\n'));
    } else {
      console.error('Fatal error:', error);
    }

    console.error('Usage: bun run db:create-admin-user --email=<email>');
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
