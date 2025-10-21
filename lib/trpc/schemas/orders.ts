/**
 * Shared Zod schemas for order validation
 * These schemas are used by both tRPC router (server) and forms (client)
 * NO SERVER DEPENDENCIES - can be imported in client components
 */

import { z } from 'zod';
import { orderStatusEnum } from '@/lib/db/schema';

// Create Zod enum from database enum values for type-safe validation
const orderStatusValues = orderStatusEnum.enumValues;
const orderStatusZodEnum = z.enum(orderStatusValues as [string, ...string[]]);

// Export type enum for orders
export const exportTypeEnum = z.enum(['csv', 'excel']);
export type ExportType = z.infer<typeof exportTypeEnum>;

export const createOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(255),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
  orderDate: z.date().optional(),
  status: orderStatusZodEnum.optional(),
  notes: z.string().max(1000).optional(),
  organizationId: z.uuid(),
});

export const updateOrderSchema = z.object({
  id: z.uuid(),
  customerName: z.string().min(1).max(255).optional(),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0')
    .optional(),
  orderDate: z.date().optional(),
  status: orderStatusZodEnum.optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const orderListFiltersSchema = z
  .object({
    statuses: z.array(orderStatusZodEnum).optional(),
    searchQuery: z.string().optional(),
    dateFrom: z.date().optional(),
    dateTo: z.date().optional(),
    minAmount: z.number().optional(),
    maxAmount: z.number().optional(),
    organizationId: z.uuid(),
    page: z.number().int().positive().default(1),
    limit: z.number().int().positive().max(100).default(10),
    sortBy: z.enum(['orderDate', 'amount']).default('orderDate'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .optional();

export const deleteOrderSchema = z.object({
  id: z.uuid(),
});

export const getOrderSchema = z.object({
  id: z.uuid(),
});
