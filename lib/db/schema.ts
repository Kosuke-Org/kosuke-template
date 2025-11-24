import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { boolean, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// Enums
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);
export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'member']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
]);
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  displayName: text('display_name').notNull(),
  profileImageUrl: text('profile_image_url'),
  stripeCustomerId: text('stripe_customer_id').unique(), // Stripe customer ID
  notificationSettings: text('notification_settings'), // JSON string for notification preferences
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  activeOrganizationId: uuid('active_organization_id').references(() => organizations.id, {
    onDelete: 'set null',
  }),
  activeOrganizationSlug: text('active_organization_slug').references(() => organizations.slug, {
    onDelete: 'set null',
  }),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verifications = pgTable('verifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  logo: text('logo'), // TODO make nullable
  metadata: text('metadata'),
});

// Organization Memberships - Links users to organizations
export const orgMemberships = pgTable('org_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role: orgRoleEnum('role').notNull(),
  createdAt: timestamp('created_at').notNull(),
});

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: orgRoleEnum('role').notNull(),
  status: text('status').default('pending').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  inviterId: uuid('inviter_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
});

// User Subscriptions
export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
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

// Activity Logs - Optional app-specific logging
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  metadata: text('metadata'), // JSON string for additional context
});

// Tasks - Simple todo list functionality with organization support
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
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
  userId: uuid('user_id').notNull(),
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

// Order History - Tracks all status changes and updates to orders
export const orderHistory = pgTable('order_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, {
      onDelete: 'cascade',
    }),
  userId: uuid('user_id'), // User who made the change (nullable for external/automated updates)
  status: orderStatusEnum('status').notNull(), // Status at this point in history
  notes: text('notes'), // Optional notes about the change
  createdAt: timestamp('created_at').defaultNow().notNull(), // When this status was set
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
export type Session = InferSelectModel<typeof sessions>;
export type NewSession = InferInsertModel<typeof sessions>;
export type Verification = InferSelectModel<typeof verifications>;
export type NewVerification = InferInsertModel<typeof verifications>;
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
export type OrderHistory = InferSelectModel<typeof orderHistory>;
export type NewOrderHistory = InferInsertModel<typeof orderHistory>;

// Infer enum types from schema
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type OrgRole = (typeof orgRoleEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
