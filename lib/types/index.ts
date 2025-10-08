/**
 * Centralized type exports for the entire application
 * Import types using: import type { TypeName } from '@/lib/types'
 */

// User-related types
export type {
  // Base types
  User,
  ActivityType,

  // Clerk integration
  ClerkUserType,

  // User operations
  LocalUser,
  UserSyncResult,
  UserSyncOptions,
  UserSyncResponse,

  // Auth state
  AuthState,

  // Notification settings
  NotificationSettings,
} from './user';

// Task-related types
export type {
  // Base types
  Task,
  TaskPriority,
  NewTask,
} from './task';

// Organization-related types
export type {
  // Base types
  Organization,
  NewOrganization,
  OrgMembership,
  NewOrgMembership,
  Team,
  NewTeam,
  TeamMembership,
  NewTeamMembership,

  // Role types
  OrgRoleValue,
  TeamRoleValue,
} from './organization';

// Organization constants and helper functions
export {
  OrgRole,
  TeamRole,
  isOrgAdmin,
  isOrgMember,
  isTeamLead,
  isTeamMember,
  canManageOrganization,
  canInviteMembers,
  canManageTeams,
  canManageBilling,
  canManageTeam,
} from './organization';

// Billing and subscription types
export type {
  // Base types
  UserSubscription,
  SubscriptionTier,
  SubscriptionStatus,

  // Enhanced types
  UserSubscriptionInfo,
  SubscriptionUpdateParams,
  OperationResult,

  // State and eligibility
  SubscriptionEligibility,

  // Checkout and billing
  CheckoutSessionParams,

  // Subscription actions
  UpgradeResponse,
  SubscriptionInfo,
} from './billing';

// Billing enums
export { SubscriptionState } from './billing';

// Webhook types
export type {
  ClerkWebhookUser,
  ClerkOrganizationWebhook,
  ClerkMembershipWebhook,
  ClerkInvitationWebhook,
  ClerkWebhookEvent,
} from './webhooks';

// Webhook type guards
export { isUserEvent, isOrganizationEvent, isMembershipEvent, isInvitationEvent } from './webhooks';

// Note: API types are now handled by lib/api module
// Import from '@/lib/api' for API-related types and utilities

// Note: UI component types are handled by Shadcn UI components
// Each component exports its own specific props interface

// Common utility types
export type ID = string | number;
export type Timestamp = Date | string;
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Database operation types
export type CreateInput<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>> & {
  updatedAt?: Date;
};

// Query and filter types
export interface BaseQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRange {
  start: Date;
  end: Date;
}

// Event and action types
export interface AppEvent<T = Record<string, unknown>> {
  type: string;
  payload: T;
  timestamp: Date;
  userId?: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
