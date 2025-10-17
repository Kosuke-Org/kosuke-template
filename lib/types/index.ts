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

  // Role types
  OrgRoleValue,
} from './organization';

// Billing and subscription types
export type {
  // Base types
  UserSubscription,
  SubscriptionTier,
  SubscriptionStatus,

  // Enhanced types
  UserSubscriptionInfo,
  OperationResult,

  // State and eligibility
  SubscriptionEligibility,

  // Checkout and billing
  CheckoutSessionParams,
} from './billing';

// Billing enums
export { SubscriptionState } from './billing';

// Webhook types
export type {
  ClerkWebhookUser,
  ClerkOrganizationWebhook,
  ClerkMembershipWebhook,
  ClerkWebhookEvent,
} from './webhooks';

// Engine types
export type { CurrencyCode, CurrencyConvertRequest, CurrencyConvertResponse } from './engine';

// Note: API types are now handled by lib/api module
// Import from '@/lib/api' for API-related types and utilities

// Note: UI component types are handled by Shadcn UI components
// Each component exports its own specific props interface

// Custom Jwt Session Claims for Clerk
declare global {
  interface CustomJwtSessionClaims {
    publicMetadata?: {
      onboardingComplete?: boolean;
    };
  }
}
