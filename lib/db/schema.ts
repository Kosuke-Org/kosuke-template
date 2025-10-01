import { pgTable, uuid, text, timestamp, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

// Enums
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);

// Users - Minimal sync from Clerk for local queries and future expansion
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(), // Clerk user ID
  email: text('email').notNull(),
  displayName: text('display_name'),
  profileImageUrl: text('profile_image_url'),
  notificationSettings: text('notification_settings'), // JSON string for notification preferences
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Subscriptions - Links Clerk users to Polar subscriptions
export const userSubscriptions = pgTable('user_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(), // Clerk user ID
  subscriptionId: text('subscription_id').unique(), // Polar subscription ID (nullable for free tier)
  productId: text('product_id'), // Polar product ID (nullable for free tier)
  status: text('status').notNull(), // 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'
  tier: text('tier').notNull(), // 'free', 'pro', 'business'
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
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

// Tasks - Simple todo list functionality
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(), // Clerk user ID
  title: text('title').notNull(),
  description: text('description'),
  completed: text('completed').notNull().default('false'), // 'true' or 'false' as text
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations for better queries
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(userSubscriptions),
  activityLogs: many(activityLogs),
  tasks: many(tasks),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.clerkUserId],
    references: [users.clerkUserId],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.clerkUserId],
    references: [users.clerkUserId],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.clerkUserId],
    references: [users.clerkUserId],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const selectUserSchema = createSelectSchema(users);

export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
});
export const selectUserSubscriptionSchema = createSelectSchema(userSubscriptions);

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true });
export const selectActivityLogSchema = createSelectSchema(activityLogs);

export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true });
export const selectTaskSchema = createSelectSchema(tasks);

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
}

// Types
export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type UserSubscription = z.infer<typeof selectUserSubscriptionSchema>;
export type NewUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type ActivityLog = z.infer<typeof selectActivityLogSchema>;
export type NewActivityLog = z.infer<typeof insertActivityLogSchema>;
export type Task = z.infer<typeof selectTaskSchema>;
export type NewTask = z.infer<typeof insertTaskSchema>;

// Infer enum types from schema
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
