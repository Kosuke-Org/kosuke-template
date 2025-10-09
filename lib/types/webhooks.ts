/**
 * Webhook Type Definitions
 * Re-exports and extensions of Clerk webhook types
 */

import type {
  UserJSON,
  OrganizationJSON,
  OrganizationMembershipJSON,
  OrganizationInvitationJSON,
} from '@clerk/types';

import type {
  UserWebhookEvent,
  OrganizationWebhookEvent,
  OrganizationMembershipWebhookEvent,
  OrganizationInvitationWebhookEvent,
  WebhookEvent,
} from '@clerk/nextjs/server';

/**
 * Clerk Webhook Payloads
 * Re-export Clerk's official types for webhook payloads
 */
export type ClerkWebhookUser = UserJSON;
export type ClerkOrganizationWebhook = OrganizationJSON;
export type ClerkMembershipWebhook = OrganizationMembershipJSON;
export type ClerkInvitationWebhook = OrganizationInvitationJSON;

/**
 * Clerk Webhook Event Types
 */
export type ClerkWebhookEvent = WebhookEvent;

/**
 * Type guards
 */
export function isUserEvent(event: WebhookEvent): event is UserWebhookEvent {
  return event.type.startsWith('user.');
}

export function isOrganizationEvent(event: WebhookEvent): event is OrganizationWebhookEvent {
  return event.type.startsWith('organization.');
}

export function isMembershipEvent(
  event: WebhookEvent
): event is OrganizationMembershipWebhookEvent {
  return event.type.startsWith('organizationMembership.');
}

export function isInvitationEvent(
  event: WebhookEvent
): event is OrganizationInvitationWebhookEvent {
  return event.type.startsWith('organizationInvitation.');
}
