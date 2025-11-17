#!/usr/bin/env tsx
/**
 * Database Reset Script
 *
 * This script drops all tables and schemas, then pushes the fresh schema and seeds data.
 * ⚠️ WARNING: This will delete ALL data in the database!
 */
import postgres from 'postgres';

const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

if (IS_PRODUCTION) {
  console.error('Error: Seed script cannot be run in production environment!');
  console.error('This script is for development and testing only.');
  process.exit(1);
}

if (!process.env.POSTGRES_URL) {
  console.error('POSTGRES_URL environment variable is not set');
  process.exit(1);
}

async function resetDatabase() {
  console.log('🗑️  Dropping all tables...');

  // Create a dedicated client for this operation with no notice logging
  const sql = postgres(process.env.POSTGRES_URL!, {
    onnotice: () => {}, // Suppress NOTICE messages
  });

  try {
    // Drop all tables by dropping the public schema and recreating it
    await sql`DROP SCHEMA IF EXISTS public CASCADE`;
    await sql`CREATE SCHEMA public`;
    await sql`GRANT ALL ON SCHEMA public TO public`;

    // Drop the drizzle schema - when seeding the db we will run the migrations again
    await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
    console.log('✅ All tables dropped successfully');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }

  process.exit(0);
}

resetDatabase();
