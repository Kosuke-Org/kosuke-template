/**
 * Webhook Type Definitions
 * Types for Clerk webhook payloads
 */

/**
 * Clerk User Webhook Payload
 */
export interface ClerkWebhookUser {
  id: string;
  email_addresses?: Array<{ email_address: string; id: string }>;
  first_name?: string;
  last_name?: string;
  image_url?: string;
  username?: string;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
  created_at?: number;
  updated_at?: number;
}

/**
 * Clerk Organization Webhook Payload
 */
export interface ClerkOrganizationWebhook {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  has_image: boolean;
  created_by: string;
  created_at: number;
  updated_at: number;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
  max_allowed_memberships: number;
  admin_delete_enabled: boolean;
}

/**
 * Clerk Organization Membership Webhook Payload
 */
export interface ClerkMembershipWebhook {
  id: string;
  organization: {
    id: string;
    name: string;
    slug: string;
    image_url?: string;
  };
  public_user_data: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    profile_image_url?: string;
    identifier: string; // email or username
  };
  role: string; // 'org:admin' | 'org:member'
  created_at: number;
  updated_at: number;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
}

/**
 * Clerk Organization Invitation Webhook Payload
 */
export interface ClerkInvitationWebhook {
  id: string;
  email_address: string;
  organization_id: string;
  role: string; // 'org:admin' | 'org:member'
  status: 'pending' | 'accepted' | 'revoked';
  created_at: number;
  updated_at: number;
  public_metadata?: Record<string, unknown>;
  private_metadata?: Record<string, unknown>;
}

/**
 * Clerk Webhook Event Types
 */
export type ClerkWebhookEventType =
  // User events
  | 'user.created'
  | 'user.updated'
  | 'user.deleted'
  // Organization events
  | 'organization.created'
  | 'organization.updated'
  | 'organization.deleted'
  // Membership events
  | 'organizationMembership.created'
  | 'organizationMembership.updated'
  | 'organizationMembership.deleted'
  // Invitation events
  | 'organizationInvitation.created'
  | 'organizationInvitation.accepted'
  | 'organizationInvitation.revoked'
  // Session events
  | 'session.created'
  | 'session.ended'
  | 'session.removed'
  | 'session.revoked';

/**
 * Generic Clerk Webhook Event
 */
export interface ClerkWebhookEvent<T = unknown> {
  type: ClerkWebhookEventType;
  object: 'event';
  data: T;
}

/**
 * Specific webhook event types
 */
export type UserCreatedEvent = ClerkWebhookEvent<ClerkWebhookUser>;
export type UserUpdatedEvent = ClerkWebhookEvent<ClerkWebhookUser>;
export type UserDeletedEvent = ClerkWebhookEvent<ClerkWebhookUser>;

export type OrganizationCreatedEvent = ClerkWebhookEvent<ClerkOrganizationWebhook>;
export type OrganizationUpdatedEvent = ClerkWebhookEvent<ClerkOrganizationWebhook>;
export type OrganizationDeletedEvent = ClerkWebhookEvent<ClerkOrganizationWebhook>;

export type MembershipCreatedEvent = ClerkWebhookEvent<ClerkMembershipWebhook>;
export type MembershipUpdatedEvent = ClerkWebhookEvent<ClerkMembershipWebhook>;
export type MembershipDeletedEvent = ClerkWebhookEvent<ClerkMembershipWebhook>;

export type InvitationCreatedEvent = ClerkWebhookEvent<ClerkInvitationWebhook>;
export type InvitationAcceptedEvent = ClerkWebhookEvent<ClerkInvitationWebhook>;
export type InvitationRevokedEvent = ClerkWebhookEvent<ClerkInvitationWebhook>;

/**
 * Union type of all webhook events
 */
export type AnyClerkWebhookEvent =
  | UserCreatedEvent
  | UserUpdatedEvent
  | UserDeletedEvent
  | OrganizationCreatedEvent
  | OrganizationUpdatedEvent
  | OrganizationDeletedEvent
  | MembershipCreatedEvent
  | MembershipUpdatedEvent
  | MembershipDeletedEvent
  | InvitationCreatedEvent
  | InvitationAcceptedEvent
  | InvitationRevokedEvent;

/**
 * Type guards
 */
export function isUserEvent(event: AnyClerkWebhookEvent): event is UserCreatedEvent | UserUpdatedEvent | UserDeletedEvent {
  return event.type.startsWith('user.');
}

export function isOrganizationEvent(event: AnyClerkWebhookEvent): event is OrganizationCreatedEvent | OrganizationUpdatedEvent | OrganizationDeletedEvent {
  return event.type.startsWith('organization.');
}

export function isMembershipEvent(event: AnyClerkWebhookEvent): event is MembershipCreatedEvent | MembershipUpdatedEvent | MembershipDeletedEvent {
  return event.type.startsWith('organizationMembership.');
}

export function isInvitationEvent(event: AnyClerkWebhookEvent): event is InvitationCreatedEvent | InvitationAcceptedEvent | InvitationRevokedEvent {
  return event.type.startsWith('organizationInvitation.');
}
