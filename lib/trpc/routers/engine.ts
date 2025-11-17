/**
 * tRPC router for engine operations
 * Handles more complex operations like algorithmic functionalities, calculations, etc.
 */
import { TRPCError } from '@trpc/server';

import { EngineError, convertCurrency } from '@/lib/engine';

import { protectedProcedure, router } from '../init';
import { currencyConvertRequestSchema, currencyConvertResponseSchema } from '../schemas/engine';

export const engineRouter = router({
  convert: protectedProcedure
    .input(currencyConvertRequestSchema)
    .output(currencyConvertResponseSchema)
    .mutation(async ({ input }) => {
      try {
        return await convertCurrency(input);
      } catch (error) {
        if (error instanceof EngineError) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Engine error: ${error.message}`,
          });
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Currency conversion failed',
        });
      }
    }),
});
