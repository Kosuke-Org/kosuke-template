import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createMockTRPCContext } from '@/__tests__/setup/mocks';
import { expectTRPCError } from '@/__tests__/setup/utils';

import { db } from '@/lib/db/drizzle';
import { ERRORS } from '@/lib/services/constants';
import * as orderService from '@/lib/services/order-service';
import { createCaller } from '@/lib/trpc/server';

vi.mock('@/lib/db/drizzle', () => ({
  db: {
    query: {
      orgMemberships: {
        findFirst: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/services/order-service', () => ({
  listOrders: vi.fn(),
  getOrderById: vi.fn(),
  getOrderHistory: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  exportOrders: vi.fn(),
}));

describe('Orders Router', () => {
  const userId = 'user_123';
  const organizationId = '22222222-2222-4222-8222-222222222222';
  const otherOrganizationId = '33333333-3333-4333-8333-333333333333';
  const orderId = '44444444-4444-4444-8444-444444444444';

  const mockOrder = {
    id: orderId,
    customerName: 'Acme Corp',
    status: 'pending' as const,
    currency: 'USD',
    amount: '99.99',
    orderDate: new Date('2026-01-01'),
    notes: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    organizationId,
    userId,
    userDisplayName: 'John Doe',
    userEmail: 'john@example.com',
  };

  const membership = {
    id: 'membership_1',
    organizationId,
    userId,
    role: 'member' as const,
    createdAt: new Date('2026-01-01'),
  };

  const memberCaller = () => createCaller(createMockTRPCContext({ userId }));
  const anonCaller = () => createCaller(createMockTRPCContext({ userId: null }));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(membership);
  });

  describe('orgProcedure authorization', () => {
    it('rejects an unauthenticated caller before any membership lookup', async () => {
      const caller = await anonCaller();

      await expectTRPCError(caller.orders.get({ id: orderId, organizationId }), 'UNAUTHORIZED');
      expect(db.query.orgMemberships.findFirst).not.toHaveBeenCalled();
    });

    it('rejects a caller who is not a member of the requested organization', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.orders.get({ id: orderId, organizationId: otherOrganizationId }),
        'FORBIDDEN',
        'do not have access to this organization'
      );
      expect(orderService.getOrderById).not.toHaveBeenCalled();
    });

    it('uses the organization from the validated input, not from the session context', async () => {
      vi.mocked(orderService.getOrderById).mockResolvedValue(mockOrder);

      // Session points at a different active organization than the input does.
      const caller = await createCaller(
        createMockTRPCContext({ userId, activeOrganizationId: otherOrganizationId })
      );
      await caller.orders.get({ id: orderId, organizationId });

      expect(orderService.getOrderById).toHaveBeenCalledWith({ orderId, organizationId });
    });
  });

  describe('list', () => {
    // listOrders selects a joined projection, not the raw order row.
    const listResult = {
      orders: [
        {
          id: orderId,
          customerName: 'Acme Corp',
          status: 'pending' as const,
          amount: '99.99',
          orderDate: new Date('2026-01-01'),
          notes: null,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
          organizationName: 'Acme',
          organizationSlug: 'acme',
          userDisplayName: 'John Doe',
          userEmail: 'john@example.com',
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    it('forwards every filter to the service with defaults applied', async () => {
      vi.mocked(orderService.listOrders).mockResolvedValue(listResult);

      const caller = await memberCaller();
      const result = await caller.orders.list({
        organizationId,
        statuses: ['pending'],
        searchQuery: 'acme',
        minAmount: 10,
        maxAmount: 100,
      });

      expect(result).toEqual(listResult);
      expect(orderService.listOrders).toHaveBeenCalledWith({
        organizationId,
        statuses: ['pending'],
        searchQuery: 'acme',
        dateFrom: undefined,
        dateTo: undefined,
        minAmount: 10,
        maxAmount: 100,
        page: 1,
        limit: 10,
        sortBy: 'orderDate',
        sortOrder: 'desc',
      });
    });

    it('rejects an unknown order status', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.orders.list({ organizationId, statuses: ['not-a-status'] }),
        'BAD_REQUEST'
      );
      expect(orderService.listOrders).not.toHaveBeenCalled();
    });

    it('rejects a limit above the 100 maximum', async () => {
      const caller = await memberCaller();

      await expectTRPCError(caller.orders.list({ organizationId, limit: 500 }), 'BAD_REQUEST');
      expect(orderService.listOrders).not.toHaveBeenCalled();
    });

    it('fails with an unmapped INTERNAL_SERVER_ERROR when input is omitted entirely', async () => {
      // The zod schema is `.optional()`, but orgProcedure dereferences the raw input to read
      // organizationId. Documents current behavior: this is a crash, not a clean BAD_REQUEST.
      const caller = await memberCaller();

      await expectTRPCError(caller.orders.list(), 'INTERNAL_SERVER_ERROR');
      expect(orderService.listOrders).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('returns the order scoped to the caller organization', async () => {
      vi.mocked(orderService.getOrderById).mockResolvedValue(mockOrder);

      const caller = await memberCaller();
      const result = await caller.orders.get({ id: orderId, organizationId });

      expect(result).toEqual(mockOrder);
      expect(orderService.getOrderById).toHaveBeenCalledWith({ orderId, organizationId });
    });

    it('surfaces NOT_FOUND for an order in another organization', async () => {
      vi.mocked(orderService.getOrderById).mockRejectedValue(
        new Error('Order not found', { cause: ERRORS.NOT_FOUND })
      );

      const caller = await memberCaller();

      await expectTRPCError(
        caller.orders.get({ id: orderId, organizationId }),
        'NOT_FOUND',
        'Order not found'
      );
    });

    it('rejects a non-uuid order id', async () => {
      const caller = await memberCaller();

      await expectTRPCError(caller.orders.get({ id: 'nope', organizationId }), 'BAD_REQUEST');
    });
  });

  describe('getHistory', () => {
    it('returns the status history for the order', async () => {
      const history = [
        {
          id: 'history_1',
          status: 'pending' as const,
          notes: 'Order created',
          createdAt: new Date('2026-01-01'),
          userDisplayName: 'John Doe',
          userEmail: 'john@example.com',
        },
      ];
      vi.mocked(orderService.getOrderHistory).mockResolvedValue(history);

      const caller = await memberCaller();
      const result = await caller.orders.getHistory({ orderId, organizationId });

      expect(result).toEqual(history);
      expect(orderService.getOrderHistory).toHaveBeenCalledWith({ orderId, organizationId });
    });

    it('surfaces NOT_FOUND when the order does not exist', async () => {
      vi.mocked(orderService.getOrderHistory).mockRejectedValue(
        new Error('Order not found', { cause: ERRORS.NOT_FOUND })
      );

      const caller = await memberCaller();

      await expectTRPCError(caller.orders.getHistory({ orderId, organizationId }), 'NOT_FOUND');
    });

    it('rejects a non-member', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(caller.orders.getHistory({ orderId, organizationId }), 'FORBIDDEN');
    });
  });

  describe('create', () => {
    it('creates an order attributed to the caller and their organization', async () => {
      vi.mocked(orderService.createOrder).mockResolvedValue(mockOrder);

      const caller = await memberCaller();
      const orderDate = new Date('2026-02-01');
      const result = await caller.orders.create({
        organizationId,
        customerName: 'Acme Corp',
        amount: '99.99',
        status: 'processing',
        orderDate,
        notes: 'rush',
      });

      expect(result).toEqual(mockOrder);
      expect(orderService.createOrder).toHaveBeenCalledWith({
        customerName: 'Acme Corp',
        userId,
        organizationId,
        amount: '99.99',
        status: 'processing',
        orderDate,
        notes: 'rush',
      });
    });

    it('omits optional fields that were not supplied', async () => {
      vi.mocked(orderService.createOrder).mockResolvedValue(mockOrder);

      const caller = await memberCaller();
      await caller.orders.create({
        organizationId,
        customerName: 'Acme Corp',
        amount: '10.00',
      });

      expect(orderService.createOrder).toHaveBeenCalledWith({
        customerName: 'Acme Corp',
        userId,
        organizationId,
        amount: '10.00',
      });
    });

    it('rejects a malformed amount', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.orders.create({ organizationId, customerName: 'Acme', amount: '12.345' }),
        'BAD_REQUEST'
      );
      expect(orderService.createOrder).not.toHaveBeenCalled();
    });

    it('rejects a zero amount', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.orders.create({ organizationId, customerName: 'Acme', amount: '0' }),
        'BAD_REQUEST'
      );
    });

    it('rejects a blank customer name', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.orders.create({ organizationId, customerName: '   ', amount: '10.00' }),
        'BAD_REQUEST'
      );
    });

    it('rejects a non-member', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(
        caller.orders.create({ organizationId, customerName: 'Acme', amount: '10.00' }),
        'FORBIDDEN'
      );
      expect(orderService.createOrder).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('forwards the changed fields together with the caller identity', async () => {
      vi.mocked(orderService.updateOrder).mockResolvedValue(mockOrder);

      const caller = await memberCaller();
      await caller.orders.update({
        id: orderId,
        organizationId,
        customerName: 'Renamed',
        status: 'shipped',
      });

      expect(orderService.updateOrder).toHaveBeenCalledWith({
        orderId,
        organizationId,
        userId,
        customerName: 'Renamed',
        amount: undefined,
        status: 'shipped',
      });
    });

    it('surfaces NOT_FOUND when the order is outside the organization', async () => {
      vi.mocked(orderService.updateOrder).mockRejectedValue(
        new Error('Order not found', { cause: ERRORS.NOT_FOUND })
      );

      const caller = await memberCaller();

      await expectTRPCError(
        caller.orders.update({ id: orderId, organizationId, status: 'shipped' }),
        'NOT_FOUND'
      );
    });

    it('rejects notes longer than 1000 characters', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        caller.orders.update({ id: orderId, organizationId, notes: 'x'.repeat(1001) }),
        'BAD_REQUEST'
      );
      expect(orderService.updateOrder).not.toHaveBeenCalled();
    });

    it('rejects an unauthenticated caller', async () => {
      const caller = await anonCaller();

      await expectTRPCError(
        caller.orders.update({ id: orderId, organizationId, status: 'shipped' }),
        'UNAUTHORIZED'
      );
    });
  });

  describe('delete', () => {
    it('deletes an order in the caller organization', async () => {
      vi.mocked(orderService.deleteOrder).mockResolvedValue({ success: true });

      const caller = await memberCaller();
      const result = await caller.orders.delete({ id: orderId, organizationId });

      expect(result).toEqual({ success: true });
      expect(orderService.deleteOrder).toHaveBeenCalledWith({ orderId, organizationId });
    });

    it('surfaces NOT_FOUND when the order does not exist', async () => {
      vi.mocked(orderService.deleteOrder).mockRejectedValue(
        new Error('Order not found', { cause: ERRORS.NOT_FOUND })
      );

      const caller = await memberCaller();

      await expectTRPCError(caller.orders.delete({ id: orderId, organizationId }), 'NOT_FOUND');
    });

    it('rejects a non-member', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(caller.orders.delete({ id: orderId, organizationId }), 'FORBIDDEN');
      expect(orderService.deleteOrder).not.toHaveBeenCalled();
    });
  });

  describe('export', () => {
    it('exports orders for the organization in the requested format', async () => {
      const exported = {
        data: 'id,customer\n1,Acme',
        filename: 'orders.csv',
        mimeType: 'text/csv',
      };
      vi.mocked(orderService.exportOrders).mockResolvedValue(exported);

      const caller = await memberCaller();
      const result = await caller.orders.export({ organizationId, type: 'csv' });

      expect(result).toEqual(exported);
      expect(orderService.exportOrders).toHaveBeenCalledWith({ organizationId, type: 'csv' });
    });

    it('rejects an unsupported export type', async () => {
      const caller = await memberCaller();

      await expectTRPCError(
        // @ts-expect-error - deliberately invalid export type
        caller.orders.export({ organizationId, type: 'pdf' }),
        'BAD_REQUEST'
      );
      expect(orderService.exportOrders).not.toHaveBeenCalled();
    });

    it('rejects a non-member', async () => {
      vi.mocked(db.query.orgMemberships.findFirst).mockResolvedValue(undefined);

      const caller = await memberCaller();

      await expectTRPCError(caller.orders.export({ organizationId, type: 'excel' }), 'FORBIDDEN');
    });
  });
});
