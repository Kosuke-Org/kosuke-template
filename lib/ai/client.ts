import type {
  CreateFileSearchStoreParameters,
  DeleteDocumentParameters,
  DeleteFileSearchStoreParameters,
  GenerateContentParameters,
  GroundingMetadata,
  UploadToFileSearchStoreParameters,
} from '@google/genai';
import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GOOGLE_AI_API_KEY;

if (!apiKey) {
  throw new Error('GOOGLE_AI_API_KEY environment variable is required');
}

const DEFAULT_MODEL = 'gemini-2.5-flash';
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
  const { file, fileSearchStoreName, config } = params;
  const operation = await ai.fileSearchStores.uploadToFileSearchStore({
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

/**
 * Generate content with File Search tool
 * Simplified response to return only text and citations
 */

interface ContentResponse {
  text: string;
  groundingMetadata?: GroundingMetadata;
}

export async function generateContent(
  params: Omit<GenerateContentParameters, 'model'>
): Promise<ContentResponse> {
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: params.contents,
    config: params.config,
  });

  return {
    text: response.text || '',
    groundingMetadata: response.candidates?.[0]?.groundingMetadata,
  };
}

export type { GroundingMetadata };
