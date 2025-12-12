import { z } from 'zod';

import { MAX_FILE_SIZE, SUPPORTED_MIME_TYPES, SupportedMimeType } from '@/lib/documents/constants';

// Document schemas
export const uploadDocumentSchema = z.object({
  organizationId: z.uuid(),
  displayName: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters'),
  mimeType: z.string().refine((type) => SUPPORTED_MIME_TYPES.includes(type as SupportedMimeType), {
    message: 'Unsupported file type',
  }),
  sizeBytes: z.string().refine(
    (size) => {
      const bytes = Number.parseInt(size, 10);
      return !Number.isNaN(bytes) && bytes > 0 && bytes <= MAX_FILE_SIZE;
    },
    {
      message: `File size must be between 1 byte and ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  ),
  fileBase64: z.string().min(1, 'File content is required'),
});

export const listDocumentsSchema = z.object({
  organizationId: z.uuid(),
  searchQuery: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().min(1).max(100).default(20),
});

export const deleteDocumentSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
});

// Chat schemas
export const createChatSessionSchema = z.object({
  organizationId: z.uuid(),
  title: z.string().min(1).max(255).optional(),
  initialMessage: z.string().min(1).optional(),
});

export const sendChatMessageSchema = z.object({
  sessionId: z.uuid(),
  organizationId: z.uuid(),
  content: z.string().min(1),
});

export const listChatSessionsSchema = z.object({
  organizationId: z.uuid(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().min(1).max(100).default(20),
});

export const getChatSessionSchema = z.object({
  sessionId: z.uuid(),
  organizationId: z.uuid(),
});

export const deleteChatSessionSchema = z.object({
  sessionId: z.uuid(),
  organizationId: z.uuid(),
});

export const updateChatSessionTitleSchema = z.object({
  sessionId: z.uuid(),
  organizationId: z.uuid(),
  title: z.string().min(1).max(255),
});
