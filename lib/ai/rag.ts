import type {
  CreateFileSearchStoreParameters,
  DeleteDocumentParameters,
  DeleteFileSearchStoreParameters,
  UploadToFileSearchStoreParameters,
} from '@google/genai';
import { GoogleGenAI } from '@google/genai';

import { getConfigOrEnv } from '@/lib/services/config-service';
import { CONFIG_KEYS } from '@/lib/services/constants';

/**
 * Centralized Google AI client configuration
 * Single source of truth for all Google AI API interactions
 *
 * Lazy initialization - only throws error when actually used.
 * This allows the app to run without Google AI configured.
 * Users must provide their own GOOGLE_AI_API_KEY to enable AI features.
 *
 * The Google AI API key is checked in two places (priority order):
 * 1. Database (system_config table) - for BYOK (Bring Your Own Key) pattern
 * 2. Environment variable - fallback for traditional .env configuration
 */

let aiClient: GoogleGenAI | null = null;
let initPromise: Promise<GoogleGenAI> | null = null;

/**
 * Get initialized Google AI client
 * Automatically checks database and environment for API key
 *
 * @returns Promise<GoogleGenAI> - Initialized Google AI client
 * @throws Error if GOOGLE_AI_API_KEY is not configured
 *
 * @example
 * const client = await getClient();
 * const store = await client.fileSearchStores.create({ config });
 */
async function getClient(): Promise<GoogleGenAI> {
  if (aiClient) {
    return aiClient;
  }

  // Cache the initialization promise to avoid duplicate DB queries
  if (!initPromise) {
    initPromise = (async () => {
      const apiKey = await getConfigOrEnv(CONFIG_KEYS.GOOGLE_AI_API_KEY);

      if (!apiKey) {
        throw new Error(
          'GOOGLE_AI_API_KEY is required. Configure it via:\n' +
            '1. Admin panel (System → API Keys)\n' +
            '2. Environment variable (GOOGLE_AI_API_KEY)'
        );
      }

      aiClient = new GoogleGenAI({ apiKey });

      return aiClient;
    })();
  }

  return initPromise;
}

/**
 * Create a new File Search Store
 */
export async function createFileSearchStore(config: CreateFileSearchStoreParameters['config']) {
  const client = await getClient();
  return client.fileSearchStores.create({ config });
}

/**
 * Upload a file directly to a File Search Store
 */
export async function uploadToFileSearchStore(params: UploadToFileSearchStoreParameters) {
  const { file, fileSearchStoreName, config } = params;
  const client = await getClient();
  const operation = await client.fileSearchStores.uploadToFileSearchStore({
    file,
    fileSearchStoreName,
    config: {
      displayName: config?.displayName,
      mimeType: config?.mimeType,
      customMetadata: config?.customMetadata,
    },
  });

  // Poll for completion
  const MAX_ATTEMPTS = 60; // 60 attempts * 2 seconds = 2 minutes max
  let attempts = 0;
  let currentOperation = operation;

  while (!currentOperation.done) {
    if (++attempts > MAX_ATTEMPTS) {
      throw new Error('File upload operation timed out after 2 minutes');
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentOperation = await client.operations.get({ operation: currentOperation });
  }

  return currentOperation;
}

/**
 * Delete a File Search Store
 */
export async function deleteFileSearchStore({ name, config }: DeleteFileSearchStoreParameters) {
  const client = await getClient();
  return client.fileSearchStores.delete({ name, config });
}

/**
 * Delete a document and its chunks from File Search Store
 */
export async function deleteDocumentFromFileSearchStore({ name }: DeleteDocumentParameters) {
  const client = await getClient();
  return client.fileSearchStores.documents.delete({
    name,
    config: {
      force: true,
    },
  });
}

/**
 * List all File Search Stores
 */
export async function listFileSearchStores() {
  const client = await getClient();
  return client.fileSearchStores.list();
}

/**
 * List all documents in a File Search Store
 */
export async function listDocuments(fileSearchStoreName: string) {
  const client = await getClient();
  return client.fileSearchStores.documents.list({ parent: fileSearchStoreName });
}
