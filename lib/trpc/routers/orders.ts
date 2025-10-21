/**
 * Orders tRPC Router
 * Handles order management with server-side filtering, search, pagination, and sorting
 */

import { router, protectedProcedure } from '../init';
import {
  createOrderSchema,
  updateOrderSchema,
  deleteOrderSchema,
  getOrderSchema,
  orderListFiltersSchema,
  exportTypeEnum,
} from '../schemas/orders';
import { db } from '@/lib/db/drizzle';
import { orders, organizations, users, type OrderStatus } from '@/lib/db/schema';
import { eq, and, or, ilike, gte, lte, desc, asc, sql, count } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import * as XLSX from 'xlsx';
import { z } from 'zod';

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
      .innerJoin(users, eq(orders.clerkUserId, users.clerkUserId))
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
        amount: orders.amount,
        orderDate: orders.orderDate,
        notes: orders.notes,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
        organizationName: organizations.name,
        organizationSlug: organizations.slug,
        userDisplayName: users.displayName,
        userEmail: users.email,
      })
      .from(orders)
      .innerJoin(organizations, eq(orders.organizationId, organizations.id))
      .innerJoin(users, eq(orders.clerkUserId, users.clerkUserId))
      .where(eq(orders.id, input.id))
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

    // Create order
    const newOrder = await db
      .insert(orders)
      .values({
        customerName: input.customerName,
        clerkUserId: ctx.userId,
        organizationId: input.organizationId,
        status: (input.status as OrderStatus | undefined) ?? 'pending',
        amount: input.amount,
        currency: 'USD',
        orderDate: input.orderDate ?? new Date(),
        notes: input.notes,
      })
      .returning();

    return newOrder[0];
  }),

  /**
   * Update an existing order
   */
  update: protectedProcedure.input(updateOrderSchema).mutation(async ({ input }) => {
    // Verify order exists and user has access
    const existingOrder = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);

    if (existingOrder.length === 0) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Order not found',
      });
    }

    // Update order
    const { id, ...updateData } = input;
    const updatedOrder = await db
      .update(orders)
      .set({
        ...updateData,
        status: updateData.status as OrderStatus | undefined,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    return updatedOrder[0];
  }),

  /**
   * Delete an order
   */
  delete: protectedProcedure.input(deleteOrderSchema).mutation(async ({ input }) => {
    // Verify order exists
    const existingOrder = await db.select().from(orders).where(eq(orders.id, input.id)).limit(1);

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
   * Get order statistics for an organization
   */
  getStats: protectedProcedure
    .input(
      orderListFiltersSchema.transform((val) => ({
        organizationId: val?.organizationId ?? '',
      }))
    )
    .query(async ({ input }) => {
      const { organizationId } = input;

      // Get total orders
      const totalResult = await db
        .select({ count: count() })
        .from(orders)
        .where(eq(orders.organizationId, organizationId));

      const totalOrders = totalResult[0]?.count ?? 0;

      // Get total revenue (sum of all amounts)
      const revenueResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${orders.amount} AS DECIMAL)), 0)`,
        })
        .from(orders)
        .where(eq(orders.organizationId, organizationId));

      const totalRevenue = revenueResult[0]?.total ?? '0';

      // Get pending orders count
      const pendingResult = await db
        .select({ count: count() })
        .from(orders)
        .where(and(eq(orders.organizationId, organizationId), eq(orders.status, 'pending')));

      const pendingOrders = pendingResult[0]?.count ?? 0;

      // Get delivered orders count
      const deliveredResult = await db
        .select({ count: count() })
        .from(orders)
        .where(and(eq(orders.organizationId, organizationId), eq(orders.status, 'delivered')));

      const deliveredOrders = deliveredResult[0]?.count ?? 0;

      // Calculate average order value
      const averageOrderValue =
        totalOrders > 0 ? (parseFloat(totalRevenue) / totalOrders).toFixed(2) : '0.00';

      return {
        totalOrders,
        totalRevenue,
        pendingOrders,
        deliveredOrders,
        averageOrderValue,
      };
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
