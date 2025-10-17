/**
 * Webhook Type Definitions
 * Re-exports and extensions of Clerk webhook types
 */

import type { UserJSON, OrganizationJSON, OrganizationMembershipJSON } from '@clerk/types';

import type { WebhookEvent } from '@clerk/nextjs/server';

/**
 * Clerk Webhook Payloads
 * Re-export Clerk's official types for webhook payloads
 */
export type ClerkWebhookUser = UserJSON;
export type ClerkOrganizationWebhook = OrganizationJSON;
export type ClerkMembershipWebhook = OrganizationMembershipJSON;

/**
 * Clerk Webhook Event Types
 */
export type ClerkWebhookEvent = WebhookEvent;
