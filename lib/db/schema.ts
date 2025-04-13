import { pgTable, serial, text, timestamp, integer, varchar, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  role: text('role').notNull().default('user'),
  imageUrl: text('image_url'),
  marketingEmails: boolean('marketing_emails').default(false),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  activityLogs: many(activityLogs),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const selectUserSchema = createSelectSchema(users);

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true });
export const selectActivityLogSchema = createSelectSchema(activityLogs);

// Activity types enum
export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  UPDATE_PREFERENCES = 'UPDATE_PREFERENCES',
  UPDATE_PROFILE = 'UPDATE_PROFILE',
}

// Types
export type User = z.infer<typeof selectUserSchema>;
export type NewUser = z.infer<typeof insertUserSchema>;
export type ActivityLog = z.infer<typeof selectActivityLogSchema>;
export type NewActivityLog = z.infer<typeof insertActivityLogSchema>;
