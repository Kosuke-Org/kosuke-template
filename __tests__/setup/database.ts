import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import * as schema from '@/lib/db/schema';

// Test database configuration
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/kosuke_test';

let testDb: ReturnType<typeof drizzle> | null = null;
let testClient: ReturnType<typeof postgres> | null = null;

export async function setupTestDatabase() {
  if (testDb) return testDb;

  try {
    testClient = postgres(TEST_DATABASE_URL, { max: 1 });
    testDb = drizzle(testClient, { schema });

    // Run migrations
    await migrate(testDb, { migrationsFolder: './lib/db/migrations' });

    return testDb;
  } catch (error) {
    console.error('Failed to setup test database:', error);
    throw error;
  }
}

export async function cleanupTestDatabase() {
  if (testClient) {
    await testClient.end();
    testClient = null;
    testDb = null;
  }
}

export async function clearTestData() {
  if (!testDb) throw new Error('Test database not initialized');

  // Clear all tables in reverse dependency order
  await testDb.delete(schema.userSubscriptions);
  await testDb.delete(schema.users);
}

export function getTestDb() {
  if (!testDb) throw new Error('Test database not initialized');
  return testDb;
}
