import { hashPassword } from '../auth/session';
import { eq } from 'drizzle-orm';

import { db } from './drizzle';
import { users } from './schema';

async function seed() {
  // Handle user creation or retrieval
  const email = 'admin@example.com';
  const password = 'admin12345';
  const passwordHash = await hashPassword(password);

  // Check if the user already exists
  const existingUsers = await db.select().from(users).where(eq(users.email, email));

  let user = existingUsers[0];

  if (!user) {
    // User doesn't exist, create a new one
    console.log('Creating new user...');

    const [newUser] = await db
      .insert(users)
      .values([
        {
          email: email,
          passwordHash: passwordHash,
          name: 'Admin User',
        },
      ])
      .returning();

    user = newUser;
    console.log('User created successfully.');
  } else {
    console.log('User already exists, using existing user.');
  }
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
