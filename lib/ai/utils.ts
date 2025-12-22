import type { GroundingMetadata } from '@google/genai';

interface ExtendedRetrievedContext {
  title?: string;
  text?: string;
  uri?: string;
  fileSearchStore?: string;
}

/**
 * Extract relevant sources from grounding metadata
 * Returns only documents that were actually cited in the response
 */
export function extractRelevantSources(groundingMetadata: GroundingMetadata) {
  // If no grounding chunks, return empty array
  if (!groundingMetadata.groundingChunks || groundingMetadata.groundingChunks.length === 0) {
    return [];
  }

  // Get indices of chunks that were actually cited in the response
  const citedChunkIndices = new Set(
    (groundingMetadata.groundingSupports || []).flatMap(
      (support) => support.groundingChunkIndices || []
    )
  );

  // If no grounding supports, show all chunks (fallback)
  const relevantChunks =
    citedChunkIndices.size > 0
      ? groundingMetadata.groundingChunks.filter((_, index) => citedChunkIndices.has(index))
      : groundingMetadata.groundingChunks;

  // Deduplicate by document title and extract relevant info
  const uniqueSources = Array.from(
    new Map(
      relevantChunks.map((chunk) => {
        const retrievedContext = chunk.retrievedContext as ExtendedRetrievedContext;
        return [
          retrievedContext?.title,
          {
            title: retrievedContext?.title || '',
            fileSearchStoreName: retrievedContext?.fileSearchStore || '',
          },
        ];
      })
    ).values()
  );

  return uniqueSources.filter((source) => source.title);
}

/**
 * Extract document ID from filename
 * Filenames are stored as: {documentId}-{originalDisplayName}
 * Document IDs are UUIDs in format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * Example: "643692fb-45a0-430f-868f-0ad6b8392fe5-Hello-world.rtf" -> "643692fb-45a0-430f-868f-0ad6b8392fe5"
 */
export function extractDocumentIdFromFilename(filename: string): string | null {
  // Match UUID pattern (8-4-4-4-12 hex digits) at the start of the filename
  const uuidPattern = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-/i;
  const match = filename.match(uuidPattern);
  return match ? match[1] : null;
}
