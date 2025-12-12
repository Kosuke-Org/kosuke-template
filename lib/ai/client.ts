import type { GoogleGenAI as GoogleGenAIClass } from '@google/genai';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  throw new Error('GOOGLE_AI_API_KEY environment variable is required');
}

const ai = new GoogleGenAI({ apiKey });

// Infer types from the library
type FileSearchStoresAPI = GoogleGenAIClass['fileSearchStores'];
type CreateParams = Parameters<FileSearchStoresAPI['create']>[0];
type UploadParams = Parameters<FileSearchStoresAPI['uploadToFileSearchStore']>[0];

/**
 * Create a new File Search Store
 */
export function createFileSearchStore(config: CreateParams['config']) {
  return ai.fileSearchStores.create({ config });
}

/**
 * Upload a file directly to a File Search Store
 */
export async function uploadToFileSearchStore(params: UploadParams) {
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
export async function deleteFileSearchStore(name: string) {
  return ai.fileSearchStores.delete({ name, config: { force: true } });
}

/**
 * Delete a document and its chunks from File Search Store
 */
export function deleteDocumentFromFileSearchStore(name: string) {
  return ai.fileSearchStores.documents.delete({
    name,
    config: {
      force: true, // Delete chunks and related objects
    },
  });
}
