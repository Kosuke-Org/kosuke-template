/**
 * Engine Schemas
 * Zod validation schemas for engine operations (client-safe)
 * NO SERVER DEPENDENCIES - only Zod imports allowed!
 */

import { z } from 'zod';

const currencyCodeSchema = z.enum(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY']);

export const currencyConvertRequestSchema = z.object({
  amount: z.number().min(0, 'Amount cannot be negative'),
  from_currency: currencyCodeSchema,
  to_currency: currencyCodeSchema,
});

export const currencyConvertResponseSchema = z.object({
  converted_amount: z.number(),
  from_currency: currencyCodeSchema,
  to_currency: currencyCodeSchema,
  exchange_rate: z.number(),
});
