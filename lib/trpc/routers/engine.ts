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
import { convertCurrency, EngineError } from '@/lib/engine/client';

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
