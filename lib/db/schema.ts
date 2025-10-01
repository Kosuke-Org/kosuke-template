import { pgTable, serial, text, timestamp, varchar, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { relations } from 'drizzle-orm';

// Enums
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);
export const orgRoleEnum = pgEnum('org_role', ['org:admin', 'org:member']);
export const teamRoleEnum = pgEnum('team_role', ['lead', 'member']);

// Users - Minimal sync from Clerk for local queries and future expansion
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').notNull().unique(), // Clerk user ID
  email: text('email').notNull(),
  displayName: text('display_name'),
  profileImageUrl: text('profile_image_url'),
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

// Teams - Groups within organizations
export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  color: text('color'), // Hex color for UI
  createdBy: text('created_by').notNull(), // clerkUserId
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Team Memberships - Links users to teams
export const teamMemberships = pgTable('team_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  clerkUserId: text('clerk_user_id')
    .notNull()
    .references(() => users.clerkUserId, { onDelete: 'cascade' }),
  role: teamRoleEnum('role').notNull().default('member'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

// User Subscriptions - Links Clerk users/organizations to Polar subscriptions
export const userSubscriptions = pgTable('user_subscriptions', {
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(), // Clerk user ID (owner/admin)
  organizationId: uuid('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }), // Nullable for personal subscriptions
  subscriptionType: text('subscription_type').notNull().default('personal'), // 'personal' | 'organization'
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
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(), // Clerk user ID
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  metadata: text('metadata'), // JSON string for additional context
});

// Tasks - Simple todo list functionality with organization support
export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  clerkUserId: text('clerk_user_id').notNull(), // Clerk user ID (creator)
  organizationId: uuid('organization_id').references(() => organizations.id, {
    onDelete: 'cascade',
  }), // Nullable for personal tasks
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'set null' }), // Nullable
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
  orgMemberships: many(orgMemberships),
  teamMemberships: many(teamMemberships),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  memberships: many(orgMemberships),
  teams: many(teams),
  tasks: many(tasks),
  subscriptions: many(userSubscriptions),
}));

export const orgMembershipsRelations = relations(orgMemberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMemberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orgMemberships.clerkUserId],
    references: [users.clerkUserId],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [teams.organizationId],
    references: [organizations.id],
  }),
  memberships: many(teamMemberships),
  tasks: many(tasks),
}));

export const teamMembershipsRelations = relations(teamMemberships, ({ one }) => ({
  team: one(teams, {
    fields: [teamMemberships.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [teamMemberships.clerkUserId],
    references: [users.clerkUserId],
  }),
}));

export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.clerkUserId],
    references: [users.clerkUserId],
  }),
  organization: one(organizations, {
    fields: [userSubscriptions.organizationId],
    references: [organizations.id],
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
  organization: one(organizations, {
    fields: [tasks.organizationId],
    references: [organizations.id],
  }),
  team: one(teams, {
    fields: [tasks.teamId],
    references: [teams.id],
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

export const insertOrganizationSchema = createInsertSchema(organizations).omit({ id: true });
export const selectOrganizationSchema = createSelectSchema(organizations);

export const insertOrgMembershipSchema = createInsertSchema(orgMemberships).omit({ id: true });
export const selectOrgMembershipSchema = createSelectSchema(orgMemberships);

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const selectTeamSchema = createSelectSchema(teams);

export const insertTeamMembershipSchema = createInsertSchema(teamMemberships).omit({
  id: true,
});
export const selectTeamMembershipSchema = createSelectSchema(teamMemberships);

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
  TEAM_CREATED = 'team_created',
  TEAM_UPDATED = 'team_updated',
  TEAM_DELETED = 'team_deleted',
  TEAM_MEMBER_ADDED = 'team_member_added',
  TEAM_MEMBER_REMOVED = 'team_member_removed',
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
export type Organization = z.infer<typeof selectOrganizationSchema>;
export type NewOrganization = z.infer<typeof insertOrganizationSchema>;
export type OrgMembership = z.infer<typeof selectOrgMembershipSchema>;
export type NewOrgMembership = z.infer<typeof insertOrgMembershipSchema>;
export type Team = z.infer<typeof selectTeamSchema>;
export type NewTeam = z.infer<typeof insertTeamSchema>;
export type TeamMembership = z.infer<typeof selectTeamMembershipSchema>;
export type NewTeamMembership = z.infer<typeof insertTeamMembershipSchema>;

// Infer enum types from schema
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type OrgRole = (typeof orgRoleEnum.enumValues)[number];
export type TeamRole = (typeof teamRoleEnum.enumValues)[number];
