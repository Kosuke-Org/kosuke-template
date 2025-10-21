/**
 * Shared Zod schemas for user validation
 * These schemas are used by both tRPC router (server) and forms (client)
 * NO SERVER DEPENDENCIES - can be imported in client components
 */

import { z } from 'zod';

export const notificationSettingsSchema = z.object({
  emailNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  securityAlerts: z.boolean(),
});

export const uploadProfileImageSchema = z.object({
  fileBase64: z.string(),
  fileName: z.string(),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

export const updateDisplayNameSchema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(100),
});

export const updateUserPublicMetadataSchema = z.object({
  publicMetadata: z.object({
    onboardingComplete: z.boolean().optional().prefault(false),
  }),
});
