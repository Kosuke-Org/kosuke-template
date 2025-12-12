import type {
  CreateFileSearchStoreParameters,
  DeleteDocumentParameters,
  DeleteFileSearchStoreParameters,
  UploadToFileSearchStoreParameters,
} from '@google/genai';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  throw new Error('GOOGLE_AI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({ apiKey });

/**
 * Create a new File Search Store
 */
export function createFileSearchStore(config: CreateFileSearchStoreParameters['config']) {
  return ai.fileSearchStores.create({ config });
}

/**
 * Upload a file directly to a File Search Store
 */
export async function uploadToFileSearchStore(params: UploadToFileSearchStoreParameters) {
  const operation = await ai.fileSearchStores.uploadToFileSearchStore({
    file: params.file,
    fileSearchStoreName: params.fileSearchStoreName,
    config: {
      displayName: params.config?.displayName,
      mimeType: params.config?.mimeType,
    },
  });

  // Poll for completion
  let currentOperation = operation;
  while (!currentOperation.done) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    currentOperation = await ai.operations.get({ operation: currentOperation });
  }

  return currentOperation;
}

/**
 * Delete a File Search Store
 */
export async function deleteFileSearchStore({ name }: DeleteFileSearchStoreParameters) {
  return ai.fileSearchStores.delete({ name });
}

/**
 * Delete a document and its chunks from File Search Store
 */
export function deleteDocumentFromFileSearchStore({ name }: DeleteDocumentParameters) {
  return ai.fileSearchStores.documents.delete({
    name,
    config: {
      force: true,
    },
  });
}
