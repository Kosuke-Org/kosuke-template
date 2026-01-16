import { type InferInsertModel, type InferSelectModel, relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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
export const chatMessageRoleEnum = pgEnum('chat_message_role', ['user', 'assistant', 'system']);
export const documentStatusEnum = pgEnum('document_status', ['in_progress', 'ready', 'error']);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  displayName: text('display_name').notNull(),
  profileImageUrl: text('profile_image_url'),
  notificationSettings: text('notification_settings'), // JSON string for notification preferences
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
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
  activeOrganizationRole: orgRoleEnum('active_organization_role'),
});

export const accounts = pgTable(
  'accounts',
  {
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
  },
  (table) => [index('accounts_userId_idx').on(table.userId)]
);

export const verifications = pgTable(
  'verifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)]
);

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  stripeCustomerId: text('stripe_customer_id').unique(), // Stripe customer ID for org-level billing
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  logo: text('logo'), // TODO make nullable
  metadata: text('metadata'),
});

// Organization Memberships - Links users to organizations
export const orgMemberships = pgTable(
  'org_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: orgRoleEnum('role').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('org_memberships_organizationId_idx').on(table.organizationId),
    index('org_memberships_userId_idx').on(table.userId),
  ]
);

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: orgRoleEnum('role').notNull(),
    status: text('status').default('pending').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    inviterId: uuid('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('invitations_organizationId_idx').on(table.organizationId),
    index('invitations_email_idx').on(table.email),
  ]
);

// Organization Subscriptions
export const orgSubscriptions = pgTable('org_subscriptions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),
  stripeSubscriptionId: text('stripe_subscription_id').unique(), // Stripe subscription ID (nullable for free tier)
  stripeCustomerId: text('stripe_customer_id'), // Stripe customer ID (references org's customer)
  stripePriceId: text('stripe_price_id'), // Stripe price ID (nullable for free tier)
  status: text('status').notNull(), // 'active', 'canceled', 'past_due', 'unpaid', 'incomplete'
  tier: text('tier').notNull(), // Stores Stripe lookup_key (e.g., 'free_monthly', 'pro_monthly', 'business_monthly')
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: text('cancel_at_period_end').notNull().default('false'), // 'true' or 'false' - Stripe cancellation pattern
  scheduledDowngradeTier: text('scheduled_downgrade_tier'), // Target lookup_key for scheduled downgrade (nullable)
  canceledAt: timestamp('canceled_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
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
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
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
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
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

// Documents - Files uploaded to Google File Search Store
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  displayName: text('display_name').notNull(),
  // Google Document resource identifier (format: fileSearchStores/*/documents/*) - used for deletion
  documentResourceName: text('document_resource_name'), // Nullable until File Search upload completes
  fileSearchStoreName: text('file_search_store_name'), // Nullable until File Search upload completes
  storageUrl: text('storage_url').notNull(), // S3 or local storage URL
  mimeType: text('mime_type').notNull(),
  sizeBytes: text('size_bytes').notNull(), // Stored as text to preserve large numbers
  status: documentStatusEnum('status').notNull().default('in_progress'), // Upload status
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const ragSettings = pgTable('rag_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),
  systemPrompt: text('system_prompt'),
  maxOutputTokens: integer('max_output_tokens'),
  temperature: real('temperature'),
  topP: real('top_p'),
  topK: integer('top_k'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Chat Sessions - Conversation sessions with documents
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, {
      onDelete: 'cascade',
    }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, {
      onDelete: 'cascade',
    }),
  title: text('title').notNull(), // Auto-generated from first message
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Chat Messages - Individual messages in a chat session
export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatSessionId: uuid('chat_session_id')
    .notNull()
    .references(() => chatSessions.id, {
      onDelete: 'cascade',
    }),
  role: chatMessageRoleEnum('role').notNull(),
  parts: text('parts').notNull(), // JSON string of UIMessagePart[] array
  metadata: text('metadata'), // JSON string for message metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// LLM Logs - General-purpose AI logging for all LLM operations
export const llmLogs = pgTable(
  'llm_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    endpoint: text('endpoint').notNull(), // 'chat', 'embeddings', 'summarization', etc.
    model: text('model').notNull(),
    systemPrompt: text('system_prompt'),
    userPrompt: text('user_prompt'), // JSON string of UIMessagePart[] array
    response: text('response'), // JSON string of UIMessagePart[] array
    tokensUsed: integer('tokens_used'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    reasoningTokens: integer('reasoning_tokens'),
    cachedInputTokens: integer('cached_input_tokens'),
    responseTimeMs: integer('response_time_ms'),
    finishReason: text('finish_reason'), // 'stop', 'length', 'content-filter', 'tool-calls', 'error', 'other', 'unknown'
    errorMessage: text('error_message'),
    generationConfig: text('generation_config'), // JSON string of generationConfig from request
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    chatSessionId: uuid('chat_session_id').references(() => chatSessions.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_llm_logs_timestamp').on(table.timestamp.desc()),
    index('idx_llm_logs_endpoint').on(table.endpoint),
    index('idx_llm_logs_user_id').on(table.userId),
    index('idx_llm_logs_org_id').on(table.organizationId),
    index('idx_llm_logs_chat_session_id').on(table.chatSessionId),
  ]
);

export const userRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  members: many(orgMemberships),
  invitations: many(invitations),
}));

export const accountRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const organizationRelations = relations(organizations, ({ many }) => ({
  members: many(orgMemberships),
  invitations: many(invitations),
}));

export const memberRelations = relations(orgMemberships, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMemberships.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orgMemberships.userId],
    references: [users.id],
  }),
}));

export const invitationRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [invitations.inviterId],
    references: [users.id],
  }),
}));

export const documentRelations = relations(documents, ({ one }) => ({
  organization: one(organizations, {
    fields: [documents.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const chatSessionRelations = relations(chatSessions, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [chatSessions.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [chatSessions.userId],
    references: [users.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.chatSessionId],
    references: [chatSessions.id],
  }),
}));

export const orgSubscriptionRelations = relations(orgSubscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgSubscriptions.organizationId],
    references: [organizations.id],
  }),
}));

// Enums for type safety
// SubscriptionTier is now derived from products.json - import from @/lib/billing/products
export { SubscriptionTier } from '@/lib/billing/products';
export type { SubscriptionTierType } from '@/lib/billing/products';

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
export type OrgSubscription = InferSelectModel<typeof orgSubscriptions>;
export type NewOrgSubscription = InferInsertModel<typeof orgSubscriptions>;
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
export type Document = InferSelectModel<typeof documents>;
export type NewDocument = InferInsertModel<typeof documents>;
export type ChatSession = InferSelectModel<typeof chatSessions>;
export type NewChatSession = InferInsertModel<typeof chatSessions>;
export type ChatMessage = InferSelectModel<typeof chatMessages>;
export type NewChatMessage = InferInsertModel<typeof chatMessages>;
export type LLMLog = InferSelectModel<typeof llmLogs>;
export type NewLLMLog = InferInsertModel<typeof llmLogs>;
export type RagSettings = InferSelectModel<typeof ragSettings>;
export type NewRagSettings = Pick<
  InferInsertModel<typeof ragSettings>,
  'organizationId' | 'systemPrompt' | 'maxOutputTokens' | 'temperature' | 'topP' | 'topK'
>;

// Infer enum types from schema
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type OrgRole = (typeof orgRoleEnum.enumValues)[number];
export type OrderStatus = (typeof orderStatusEnum.enumValues)[number];
export type ChatMessageRole = (typeof chatMessageRoleEnum.enumValues)[number];
export type DocumentStatus = (typeof documentStatusEnum.enumValues)[number];
