/**
 * Chat-related types and validation schemas
 *
 * Type Strategy:
 * - Runtime validation: Zod schemas for JSON parsing and API validation
 */
import { z } from 'zod';

// ============================================================================
// Runtime Validation Schemas (for JSON parsing and API validation)
// ============================================================================

/**
 * Schema for message metadata validation
 * Validates the structure of sources from RAG responses
 * Note: Lightweight validation - just ensures structure is correct
 */

const messageSourceSchema = z.object({
  documentId: z.string(),
  title: z.string(),
  url: z.string(),
});

export const messageMetadataSchema = z.object({
  sources: z.array(messageSourceSchema),
});

/**
 * Schema for validating chat API request body
 * Note: Minimal validation to match AI SDK's UIMessage structure
 * - Parts validation is flexible (z.any()) to accommodate complex UIMessagePart union types
 * - Metadata validation is flexible to support custom source metadata
 */
export const chatRequestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(['user', 'assistant', 'system']),
      parts: z.array(z.any()), // Flexible validation for AI SDK types
      metadata: z.any().optional(), // Flexible validation for metadata
    })
  ),
  id: z.uuid(),
});

// ============================================================================
// Type Exports (inferred from schemas for consistency)
// ============================================================================

export type MessageSource = z.infer<typeof messageSourceSchema>;
