import { pgTable, text, timestamp, varchar, pgEnum, uuid } from 'drizzle-orm/pg-core';
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';

// Enums
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);
export const orgRoleEnum = pgEnum('org_role', ['org:admin', 'org:member']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);

// Users - Minimal sync from Clerk for local queries and future expansion
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(), // Clerk user ID
  email: text('email').notNull(),
  displayName: text('display_name'),
  profileImageUrl: text('profile_image_url'),
  stripeCustomerId: text('stripe_customer_id').unique(), // Stripe customer ID
  notificationSettings: text('notification_settings'), // JSON string for notification preferences
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Organizations - Clerk organizations synced to local database
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkOrgId: text('clerk_org_id').notNull().unique(), // Clerk organization ID
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  settings: text('settings').default('{}'), // JSON string for org-wide settings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Organization Memberships - Links users to organizations
export const orgMemberships = pgTable('org_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  clerkUserId: text('clerk_user_id')
    .notNull()
    .references(() => users.clerkUserId, { onDelete: 'cascade' }),
  clerkMembershipId: text('clerk_membership_id').notNull().unique(), // Clerk membership ID
  role: orgRoleEnum('role').notNull().default('org:member'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  invitedBy: text('invited_by'), // clerkUserId of inviter
});

// User Subscriptions - Links Clerk users/organizations to Stripe subscriptions
export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(), // Clerk user ID (owner/admin)
  organizationId: uuid('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }), // Nullable for personal subscriptions
  subscriptionType: text('subscription_type').notNull().default('personal'), // 'personal' | 'organization'
  stripeSubscriptionId: text('stripe_subscription_id').unique(), // Stripe subscription ID (nullable for free tier)
  stripeCustomerId: text('stripe_customer_id'), // Stripe customer ID (nullable for free tier)
  stripePriceId: text('stripe_price_id'), // Stripe price ID (nullable for free tier)
  status: text('status').notNull(), // 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'
  tier: text('tier').notNull(), // 'free', 'pro', 'business'
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: text('cancel_at_period_end').notNull().default('false'), // 'true' or 'false' - Stripe cancellation pattern
  scheduledDowngradeTier: text('scheduled_downgrade_tier'), // Target tier for scheduled downgrade (nullable)
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Activity Logs - Optional app-specific logging (references Clerk user IDs)
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(), // Clerk user ID
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  metadata: text('metadata'), // JSON string for additional context
});

// Tasks - Simple todo list functionality with organization support
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(), // Clerk user ID (creator)
  organizationId: uuid('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }), // Nullable for personal tasks
  title: text('title').notNull(),
  description: text('description'),
  completed: text('completed').notNull().default('false'), // 'true' or 'false' as text
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Orders - Customer orders with organization support
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(), // Serves as both ID and order number
  customerName: text('customer_name').notNull(),
  clerkUserId: text('clerk_user_id').notNull(), // User who created/manages the order
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }), // Orders always belong to an organization
  status: orderStatusEnum('status').notNull().default('pending'),
  amount: text('amount').notNull(), // Stored as text to preserve decimal precision (e.g., "1250.50")
  currency: text('currency').notNull().default('USD'),
  orderDate: timestamp('order_date').notNull().defaultNow(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Enums for type safety
export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  BUSINESS = 'business',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  UNPAID = 'unpaid',
  INCOMPLETE = 'incomplete',
}

export enum ActivityType {
  SIGN_UP = 'sign_up',
  SIGN_IN = 'sign_in',
  SIGN_OUT = 'sign_out',
  UPDATE_PASSWORD = 'update_password',
  DELETE_ACCOUNT = 'delete_account',
  UPDATE_ACCOUNT = 'update_account',
  UPDATE_PREFERENCES = 'update_preferences',
  UPDATE_PROFILE = 'update_profile',
  PROFILE_IMAGE_UPDATED = 'profile_image_updated',
  SUBSCRIPTION_CREATED = 'subscription_created',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  SUBSCRIPTION_CANCELED = 'subscription_canceled',
  ORG_CREATED = 'org_created',
  ORG_UPDATED = 'org_updated',
  ORG_DELETED = 'org_deleted',
  ORG_MEMBER_ADDED = 'org_member_added',
  ORG_MEMBER_REMOVED = 'org_member_removed',
  ORG_MEMBER_ROLE_UPDATED = 'org_member_role_updated',
}

// Types (derive from Drizzle schema to avoid Zod instance mismatches)
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type UserSubscription = InferSelectModel<typeof userSubscriptions>;
export type NewUserSubscription = InferInsertModel<typeof userSubscriptions>;
export type ActivityLog = InferSelectModel<typeof activityLogs>;
export type NewActivityLog = InferInsertModel<typeof activityLogs>;
export type Task = InferSelectModel<typeof tasks>;
export type NewTask = InferInsertModel<typeof tasks>;
export type Organization = InferSelectModel<typeof organizations>;
export type NewOrganization = InferInsertModel<typeof organizations>;
export type OrgMembership = InferSelectModel<typeof orgMemberships>;
export type NewOrgMembership = InferInsertModel<typeof orgMemberships>;
export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

// Infer enum types from schema
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type OrgRole = (typeof orgRoleEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
