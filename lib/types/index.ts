/**
 * Centralized type exports for the entire application
 * Import types using: import type { TypeName } from '@/lib/types'
 */

// User-related types
export type {
  ClerkUserType,
  LocalUser,
  UserSyncResult,
  UserSyncOptions,
  AuthState,
  NotificationSettings,
} from './user';

export type { TaskPriority } from './task';

// Order-related types
export type {
  // Base types
  Order,
  NewOrder,
  OrderStatus,
} from './order';

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
  UserSubscriptionInfo,
  OperationResult,
  SubscriptionEligibility,
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
