/**
 * Orders tRPC Router
 * Thin validation layer that delegates to order service
 */
import { z } from 'zod';

import type { OrderStatus } from '@/lib/db/schema';
import * as orderService from '@/lib/services/order-service';
import { handleApiError } from '@/lib/utils';

import { orgProcedure, router } from '../init';
import {
  createOrderSchema,
  deleteOrderSchema,
  exportTypeEnum,
  getOrderSchema,
  orderListFiltersSchema,
  updateOrderSchema,
} from '../schemas/orders';

export const ordersRouter = router({
  /**
   * List orders with server-side filtering, search, pagination, and sorting
   */
  list: orgProcedure.input(orderListFiltersSchema).query(async ({ ctx, input }) => {
    try {
      return await orderService.listOrders({
        organizationId: ctx.organizationId,
        statuses: input?.statuses as OrderStatus[] | undefined,
        searchQuery: input?.searchQuery,
        dateFrom: input?.dateFrom,
        dateTo: input?.dateTo,
        minAmount: input?.minAmount,
        maxAmount: input?.maxAmount,
        page: input?.page,
        limit: input?.limit,
        sortBy: input?.sortBy,
        sortOrder: input?.sortOrder,
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Get a single order by ID
   */
  get: orgProcedure.input(getOrderSchema).query(async ({ ctx, input }) => {
    try {
      return await orderService.getOrderById({
        orderId: input.id,
        organizationId: ctx.organizationId,
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Get order history (status changes over time)
   */
  getHistory: orgProcedure
    .input(z.object({ orderId: z.uuid(), organizationId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      try {
        return await orderService.getOrderHistory({
          orderId: input.orderId,
          organizationId: ctx.organizationId,
        });
      } catch (error) {
        handleApiError(error);
      }
    }),

  /**
   * Create a new order
   */
  create: orgProcedure.input(createOrderSchema).mutation(async ({ ctx, input }) => {
    try {
      return await orderService.createOrder({
        customerName: input.customerName,
        userId: ctx.userId,
        organizationId: ctx.organizationId,
        amount: input.amount,
        ...(input.status && { status: input.status as OrderStatus }),
        ...(input.orderDate && { orderDate: input.orderDate }),
        ...(input.notes && { notes: input.notes }),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Update an existing order
   */
  update: orgProcedure.input(updateOrderSchema).mutation(async ({ ctx, input }) => {
    try {
      return await orderService.updateOrder({
        orderId: input.id,
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        customerName: input.customerName,
        amount: input.amount,
        ...(input.status && { status: input.status as OrderStatus }),
        ...(input.orderDate && { orderDate: input.orderDate }),
        ...(input.notes && { notes: input.notes }),
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Delete an order
   */
  delete: orgProcedure.input(deleteOrderSchema).mutation(async ({ ctx, input }) => {
    try {
      return await orderService.deleteOrder({
        orderId: input.id,
        organizationId: ctx.organizationId,
      });
    } catch (error) {
      handleApiError(error);
    }
  }),

  /**
   * Export orders as CSV or Excel format
   * Exports all orders for the organization (no filtering applied)
   */
  export: orgProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        type: exportTypeEnum,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        return await orderService.exportOrders({
          organizationId: ctx.organizationId,
          type: input.type,
        });
      } catch (error) {
        handleApiError(error);
      }
    }),
});
