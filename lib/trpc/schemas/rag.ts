import { z } from 'zod';

/**
 * Schema for updating RAG settings
 * Based on Google Gemini API parameters
 */
export const updateRagSettingsSchema = z.object({
  organizationId: z.uuid('Invalid organization ID'),
  systemPrompt: z
    .string()
    .max(10000, 'System prompt must be 10,000 characters or less')
    .optional()
    .nullable(),
  maxOutputTokens: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1')
    // this varies according to the provider/model, for gemini-2.5-flash it's 65,535
    .max(65535, 'Must be 65,535 or less')
    .optional()
    .nullable(),
  temperature: z
    .number()
    .min(0, 'Must be between 0 and 2')
    .max(2, 'Must be between 0 and 2')
    .optional()
    .nullable(),
  topP: z
    .number()
    .min(0, 'Must be between 0 and 1')
    .max(1, 'Must be between 0 and 1')
    .optional()
    .nullable(),
  topK: z
    .number()
    .int('Must be a whole number')
    .min(1, 'Must be at least 1')
    .max(100, 'Must be 100 or less')
    .optional()
    .nullable(),
});

export const getRagSettingsSchema = z.object({
  organizationId: z.uuid(),
});
