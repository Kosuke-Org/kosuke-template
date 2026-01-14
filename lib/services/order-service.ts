/**
 * Order Service
 * Handles all order-related business logic and database operations
 */
import { and, asc, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import * as XLSX from 'xlsx';

import { db } from '@/lib/db/drizzle';
import {
  NewOrder,
  type Order,
  type OrderStatus,
  orderHistory,
  orders,
  organizations,
  users,
} from '@/lib/db/schema';

import { ERRORS } from './constants';

/**
 * List orders with server-side filtering, search, pagination, and sorting
 */
export async function listOrders(params: {
  organizationId: Order['organizationId'];
  statuses?: OrderStatus[];
  searchQuery?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
  page?: number;
  limit?: number;
  sortBy?: 'orderDate' | 'amount';
  sortOrder?: 'asc' | 'desc';
}) {
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
  } = params;

  // Build filter conditions
  const conditions = [eq(orders.organizationId, organizationId)];

  // Status filter (multiple statuses)
  if (statuses && statuses.length > 0) {
    conditions.push(or(...statuses.map((s) => eq(orders.status, s)))!);
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
}

/**
 * Get a single order by ID
 */
export async function getOrderById(params: {
  orderId: Order['id'];
  organizationId: Order['organizationId'];
}) {
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
    .where(and(eq(orders.id, params.orderId), eq(orders.organizationId, params.organizationId)))
    .limit(1);

  if (order.length === 0) {
    throw new Error('Order not found', { cause: ERRORS.NOT_FOUND });
  }

  return order[0];
}

/**
 * Get order history (status changes over time)
 */
export async function getOrderHistory(params: {
  orderId: Order['id'];
  organizationId: Order['organizationId'];
}) {
  // Verify order exists and user has access
  const order = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, params.orderId), eq(orders.organizationId, params.organizationId)))
    .limit(1);

  if (order.length === 0) {
    throw new Error('Order not found', { cause: ERRORS.NOT_FOUND });
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
    .where(eq(orderHistory.orderId, params.orderId))
    .orderBy(desc(orderHistory.createdAt));

  return history;
}

/**
 * Create a new order
 */
export async function createOrder(order: NewOrder) {
  const { customerName, userId, organizationId, status, amount } = order;
  const initialStatus = status ?? 'pending';

  // Create order
  const newOrder = await db
    .insert(orders)
    .values({
      customerName,
      userId: order.userId,
      organizationId,
      status: initialStatus,
      amount,
      currency: 'USD',
      orderDate: order.orderDate ?? new Date(),
      notes: order.notes,
    })
    .returning();

  // Create initial history entry
  await db.insert(orderHistory).values({
    orderId: newOrder[0].id,
    userId,
    status: initialStatus,
    notes: 'Order created',
  });

  return newOrder[0];
}

/**
 * Update an existing order
 */
export async function updateOrder(order: {
  orderId: Order['id'];
  organizationId: Order['organizationId'];
  userId: Order['userId'];
  customerName?: Order['customerName'];
  status?: OrderStatus;
  amount?: Order['amount'];
  orderDate?: Date;
  notes?: Order['notes'];
}) {
  const { orderId, organizationId, userId, ...updateData } = order;

  // Verify order exists and user has access
  const existingOrder = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.organizationId, organizationId)))
    .limit(1);

  if (existingOrder.length === 0) {
    throw new Error('Order not found', { cause: ERRORS.NOT_FOUND });
  }

  const oldStatus = existingOrder[0].status;
  const newStatus = order.status;

  // Update order
  const updatedOrder = await db
    .update(orders)
    .set({
      ...updateData,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId))
    .returning();

  // Create history entry if status changed
  if (newStatus && newStatus !== oldStatus) {
    await db.insert(orderHistory).values({
      orderId,
      userId,
      status: newStatus,
      notes: `Status changed from ${oldStatus} to ${newStatus}`,
    });
  }

  return updatedOrder[0];
}

/**
 * Delete an order
 */
export async function deleteOrder(params: {
  orderId: Order['id'];
  organizationId: Order['organizationId'];
}) {
  // Verify order exists
  const existingOrder = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, params.orderId), eq(orders.organizationId, params.organizationId)))
    .limit(1);

  if (existingOrder.length === 0) {
    throw new Error('Order not found', { cause: ERRORS.NOT_FOUND });
  }

  // Delete order (cascade will handle history)
  await db.delete(orders).where(eq(orders.id, params.orderId));

  return { success: true };
}

/**
 * Export orders as CSV or Excel format
 */
export async function exportOrders(params: {
  organizationId: Order['organizationId'];
  type: 'csv' | 'excel';
}) {
  const { organizationId, type } = params;

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
      throw new Error(`Unsupported export type: ${type}`, { cause: ERRORS.BAD_REQUEST });
  }
}
