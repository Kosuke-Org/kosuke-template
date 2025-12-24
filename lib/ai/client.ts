import type {
  CreateFileSearchStoreParameters,
  DeleteDocumentParameters,
  DeleteFileSearchStoreParameters,
  UploadToFileSearchStoreParameters,
} from '@google/genai';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is required');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Create a new File Search Store
 */
export function createFileSearchStore(config: CreateFileSearchStoreParameters['config']) {
  return getClient().fileSearchStores.create({ config });
}

/**
 * Upload a file directly to a File Search Store
 */
export async function uploadToFileSearchStore(params: UploadToFileSearchStoreParameters) {
  const { file, fileSearchStoreName, config } = params;
  const client = getClient();
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
  let currentOperation = operation;
  while (!currentOperation.done) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentOperation = await client.operations.get({ operation: currentOperation });
  }

  return currentOperation;
}

/**
 * Delete a File Search Store
 */
export async function deleteFileSearchStore({ name }: DeleteFileSearchStoreParameters) {
  return getClient().fileSearchStores.delete({ name });
}

/**
 * Delete a document and its chunks from File Search Store
 */
export function deleteDocumentFromFileSearchStore({ name }: DeleteDocumentParameters) {
  return getClient().fileSearchStores.documents.delete({
    name,
    config: {
      force: true,
    },
  });
}
