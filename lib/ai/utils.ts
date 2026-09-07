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

/**
 * Extract the generation config and resolved system instruction from the
 * request body the AI SDK recorded for a step.
 *
 * AI SDK v7 exposes `request.body` as an already-parsed object (typed
 * `unknown`); v5 exposed it as a JSON string. Both are handled so the LLM log
 * keeps its observability data either way — the string form silently produced
 * nulls after the upgrade, and `unknown` means the compiler cannot flag it.
 *
 * Requires `include: { requestBody: true }` on the call; v7 omits request
 * bodies from step results by default.
 */
export function extractRequestMetadata(body: unknown): {
  generationConfig: string | null;
  systemPrompt: string | null;
} {
  let parsed: unknown = body;

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      return { generationConfig: null, systemPrompt: null };
    }
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { generationConfig: null, systemPrompt: null };
  }

  const { generationConfig, systemInstruction } = parsed as {
    generationConfig?: unknown;
    systemInstruction?: { parts?: { text?: unknown }[] };
  };

  const systemPromptText = systemInstruction?.parts?.[0]?.text;

  return {
    generationConfig: generationConfig ? JSON.stringify(generationConfig) : null,
    systemPrompt: typeof systemPromptText === 'string' ? systemPromptText : null,
  };
}
