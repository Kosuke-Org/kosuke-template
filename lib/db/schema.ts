import { pgTable, serial, text, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

// Users - Minimal sync from StackAuth for local queries and future expansion
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  stackAuthUserId: text('stackauth_user_id').notNull().unique(), // StackAuth UUID
  email: text('email').notNull(),
  displayName: text('display_name'),
  profileImageUrl: text('profile_image_url'),
  lastSyncedAt: timestamp('last_synced_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User Subscriptions - Links StackAuth users to Polar subscriptions
export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  stackAuthUserId: text('stackauth_user_id').notNull(), // StackAuth UUID
  subscriptionId: text('subscription_id').notNull().unique(), // Polar subscription ID
  productId: text('product_id').notNull(), // Polar product ID
  status: text('status').notNull(), // 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'
  tier: text('tier').notNull(), // 'pro', 'business'
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Activity Logs - Optional app-specific logging (references StackAuth UUIDs)
export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  stackAuthUserId: text('stackauth_user_id').notNull(), // StackAuth UUID
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  metadata: text('metadata'), // JSON string for additional context
});

// Relations for better queries
export const usersRelations = relations(users, ({ many }) => ({
  subscriptions: many(userSubscriptions),
  activityLogs: many(activityLogs),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.stackAuthUserId],
    references: [users.stackAuthUserId],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.stackAuthUserId],
    references: [users.stackAuthUserId],
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
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  UPDATE_PREFERENCES = 'UPDATE_PREFERENCES',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
}

// Types
export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type UserSubscription = z.infer<typeof selectUserSubscriptionSchema>;
export type NewUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type ActivityLog = z.infer<typeof selectActivityLogSchema>;
export type NewActivityLog = z.infer<typeof insertActivityLogSchema>;
