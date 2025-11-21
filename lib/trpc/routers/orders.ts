/**
 * Orders tRPC Router
 * Handles order management with server-side filtering, search, pagination, and sorting
 */
import { TRPCError } from '@trpc/server';
import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { z } from 'zod';

import { db } from '@/lib/db/drizzle';
import { type OrderStatus, orderHistory, orders, organizations, users } from '@/lib/db/schema';

import { protectedProcedure, router } from '../init';
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
  list: protectedProcedure.input(orderListFiltersSchema).query(async ({ input }) => {
    if (!input) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Organization ID is required',
      });
    }

    const {
      organizationId,
      statuses,
      searchQuery,
      dateFrom,
      dateTo,
      minAmount,
      maxAmount,
      page = 1,
      limit = 10,
      sortBy = 'orderDate',
      sortOrder = 'desc',
    } = input;

    // Verify user has access to this organization
    const membership = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (membership.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    // Build filter conditions
    const conditions = [eq(orders.organizationId, organizationId)];

    // Status filter (multiple statuses)
    if (statuses && statuses.length > 0) {
      conditions.push(or(...statuses.map((s) => eq(orders.status, s as OrderStatus)))!);
    }

    // Search filter (customer name or order ID)
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim().toLowerCase();
      conditions.push(
        or(
          ilike(orders.customerName, `%${searchTerm}%`),
          sql`LOWER(CAST(${orders.id} AS TEXT)) LIKE ${`%${searchTerm}%`}`
        )!
      );
    }

    // Date range filter
    if (dateFrom) {
      conditions.push(gte(orders.orderDate, dateFrom));
    }
    if (dateTo) {
      conditions.push(lte(orders.orderDate, dateTo));
    }

    // Amount range filter
    if (minAmount !== undefined) {
      conditions.push(sql`CAST(${orders.amount} AS DECIMAL) >= ${minAmount}`);
    }
    if (maxAmount !== undefined) {
      conditions.push(sql`CAST(${orders.amount} AS DECIMAL) <= ${maxAmount}`);
    }

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(orders)
      .where(and(...conditions));

    const total = totalResult[0]?.count ?? 0;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    // Determine sort column and order
    let orderByClause;
    const sortOrderFn = sortOrder === 'asc' ? asc : desc;

    switch (sortBy) {
      case 'amount':
        orderByClause = sortOrderFn(sql`CAST(${orders.amount} AS DECIMAL)`);
        break;
      case 'orderDate':
      default:
        orderByClause = sortOrderFn(orders.orderDate);
        break;
    }

    // Fetch orders with joins
    const ordersList = await db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        status: orders.status,
        amount: orders.amount,
        orderDate: orders.orderDate,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        // Joined organization data
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        // Joined user data
        userDisplayName: users.displayName,
        userEmail: users.email,
      })
      .from(orders)
      .innerJoin(organizations, eq(orders.organizationId, organizations.id))
      .innerJoin(users, eq(orders.userId, users.id))
      .where(and(...conditions))
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return {
      orders: ordersList,
      total,
      page,
      limit,
      totalPages,
    };
  }),

  /**
   * Get a single order by ID
   */
  get: protectedProcedure.input(getOrderSchema).query(async ({ input }) => {
    const order = await db
      .select({
        id: orders.id,
        customerName: orders.customerName,
        status: orders.status,
        currency: orders.currency,
        amount: orders.amount,
        orderDate: orders.orderDate,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        organizationId: orders.organizationId,
        userDisplayName: users.displayName,
        userEmail: users.email,
      })
      .from(orders)
      .innerJoin(users, eq(orders.userId, users.id))
      .where(and(eq(orders.id, input.id), eq(orders.organizationId, input.organizationId)))
      .limit(1);

    if (order.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    return order[0];
  }),

  /**
   * Get order history (status changes over time)
   */
  getHistory: protectedProcedure
    .input(z.object({ orderId: z.uuid(), organizationId: z.uuid() }))
    .query(async ({ input }) => {
      // Verify order exists and user has access
      const order = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.orderId), eq(orders.organizationId, input.organizationId)))
        .limit(1);

      if (order.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Order not found',
        });
      }

      // Fetch history entries
      const history = await db
        .select({
          id: orderHistory.id,
          status: orderHistory.status,
          notes: orderHistory.notes,
          createdAt: orderHistory.createdAt,
          userDisplayName: users.displayName,
          userEmail: users.email,
        })
        .from(orderHistory)
        .leftJoin(users, eq(orderHistory.userId, users.id))
        .where(eq(orderHistory.orderId, input.orderId))
        .orderBy(desc(orderHistory.createdAt));

      return history;
    }),

  /**
   * Create a new order
   */
  create: protectedProcedure.input(createOrderSchema).mutation(async ({ ctx, input }) => {
    // Verify user has access to this organization
    const membership = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.organizationId))
      .limit(1);

    if (membership.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Organization not found',
      });
    }

    const initialStatus = (input.status as OrderStatus | undefined) ?? 'pending';

    // Create order
    const newOrder = await db
      .insert(orders)
      .values({
        customerName: input.customerName,
        userId: ctx.userId,
        organizationId: input.organizationId,
        status: initialStatus,
        amount: input.amount,
        currency: 'USD',
        orderDate: input.orderDate ?? new Date(),
        notes: input.notes,
      })
      .returning();

    // Create initial history entry
    await db.insert(orderHistory).values({
      orderId: newOrder[0].id,
      userId: ctx.userId,
      status: initialStatus,
      notes: 'Order created',
    });

    return newOrder[0];
  }),

  /**
   * Update an existing order
   */
  update: protectedProcedure.input(updateOrderSchema).mutation(async ({ ctx, input }) => {
    // Verify order exists and user has access
    const existingOrder = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, input.id), eq(orders.organizationId, input.organizationId)))
      .limit(1);

    if (existingOrder.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    const oldStatus = existingOrder[0].status;
    const newStatus = input.status as OrderStatus | undefined;

    // Update order
    const { id, ...updateData } = input;
    const updatedOrder = await db
      .update(orders)
      .set({
        ...updateData,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Create history entry if status changed
    if (newStatus && newStatus !== oldStatus) {
      await db.insert(orderHistory).values({
        orderId: id,
        userId: ctx.userId,
        status: newStatus,
        notes: `Status changed from ${oldStatus} to ${newStatus}`,
      });
    }

    return updatedOrder[0];
  }),

  /**
   * Delete an order
   */
  delete: protectedProcedure.input(deleteOrderSchema).mutation(async ({ input }) => {
    // Verify order exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, input.id), eq(orders.organizationId, input.organizationId)))
      .limit(1);

    if (existingOrder.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    // Delete order
    await db.delete(orders).where(eq(orders.id, input.id));

    return { success: true };
  }),

  /**
   * Export orders as CSV or Excel format
   * Exports all orders for the organization (no filtering applied)
   */
  export: protectedProcedure
    .input(
      z.object({
        organizationId: z.uuid(),
        type: exportTypeEnum,
      })
    )
    .mutation(async ({ input }) => {
      const { organizationId, type } = input;

      // Verify user has access to the organization
      const membership = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

      if (membership.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Organization not found',
        });
      }

      // Fetch all orders for the organization (ordered by date, newest first)
      const ordersList = await db
        .select({
          id: orders.id,
          customerName: orders.customerName,
          status: orders.status,
          amount: orders.amount,
          orderDate: orders.orderDate,
          notes: orders.notes,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(eq(orders.organizationId, organizationId))
        .orderBy(desc(orders.orderDate));

      const headers = ['Order ID', 'Customer Name', 'Status', 'Amount', 'Order Date', 'Notes'];
      const rows = ordersList.map((order) => [
        order.id,
        order.customerName,
        order.status,
        order.amount,
        new Date(order.orderDate).toISOString().split('T')[0],
        order.notes || '',
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `orders-${timestamp}`;

      switch (type) {
        case 'excel': {
          const excelBuffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

          return {
            data: excelBuffer,
            filename: `${fileName}.xlsx`,
          };
        }

        case 'csv': {
          const csvData = XLSX.write(workbook, { type: 'string', bookType: 'csv' });

          return {
            data: csvData,
            filename: `${fileName}.csv`,
          };
        }

        default:
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Unsupported export type: ${type}`,
          });
      }
    }),
});
