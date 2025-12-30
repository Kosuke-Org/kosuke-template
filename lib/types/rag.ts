/**
 * RAG (Retrieval-Augmented Generation) types
 * Types inferred from tRPC admin router
 */
import type { inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from '@/lib/trpc/router';

type RouterOutput = inferRouterOutputs<AppRouter>;

// Infer types from tRPC router output
export type FileSearchStore = RouterOutput['admin']['rag']['listStores']['stores'][number];
