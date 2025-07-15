-- Migration: Rename StackAuth columns to Clerk columns
-- This migration updates the database schema to use Clerk instead of StackAuth

-- Rename columns in users table
ALTER TABLE users RENAME COLUMN stackauth_user_id TO clerk_user_id;

-- Rename columns in user_subscriptions table
ALTER TABLE user_subscriptions RENAME COLUMN stackauth_user_id TO clerk_user_id;

-- Rename columns in activity_logs table
ALTER TABLE activity_logs RENAME COLUMN stackauth_user_id TO clerk_user_id;

-- Update any existing indexes if they exist
-- Note: This assumes standard naming conventions. Adjust if your indexes have different names.
DROP INDEX IF EXISTS users_stackauth_user_id_unique;
CREATE UNIQUE INDEX users_clerk_user_id_unique ON users(clerk_user_id);

-- Add any additional constraints or indexes as needed
-- The migration preserves all existing data while updating the column names