/**
 * tRPC router for engine operations
 * Handles more complex operations like algorithmic functionalities, calculations, etc.
 */

import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../init';
import { 
  currencyConvertRequestSchema,
  currencyConvertResponseSchema,
} from '../schemas/engine';

const ENGINE_SERVICE_URL = process.env.ENGINE_SERVICE_URL || 'http://localhost:8000';

async function proxyToEngine<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ENGINE_SERVICE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!response.ok) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Engine service unavailable',
    });
  }

  return response.json();
}

export const engineRouter = router({
  convert: protectedProcedure
    .input(currencyConvertRequestSchema)
    .output(currencyConvertResponseSchema)
    .mutation(async ({ input }) => {
      try {
        return await proxyToEngine('/convert', {
          method: 'POST',
          body: JSON.stringify(input),
        });
      } catch (_error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Currency conversion failed',
        });
      }
    }),
});
