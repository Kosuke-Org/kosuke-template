#!/usr/bin/env tsx
/**
 * Database Reset Script
 *
 * This script drops all tables and schemas, then pushes the fresh schema and seeds data.
 * ⚠️ WARNING: This will delete ALL data in the database!
 */

import postgres from 'postgres';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL environment variable is not set');
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
