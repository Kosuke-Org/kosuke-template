import { beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db/drizzle';
import { type Order, type OrderStatus } from '@/lib/db/schema';
import * as orderService from '@/lib/services/order-service';

// Mock the database
vi.mock('@/lib/db/drizzle', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock xlsx library
vi.mock('xlsx', () => ({
  default: {
    utils: {
      aoa_to_sheet: vi.fn(() => ({})),
      book_new: vi.fn(() => ({})),
      book_append_sheet: vi.fn(),
    },
    write: vi.fn((workbook, options) => {
      if (options.type === 'base64') {
        return 'base64data';
      }
      return 'csv,data,here';
    }),
  },
  utils: {
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  write: vi.fn((workbook, options) => {
    if (options.type === 'base64') {
      return 'base64data';
    }
    return 'csv,data,here';
  }),
}));

describe('OrderService', () => {
  const mockOrganizationId = 'org-123';
  const mockUserId = 'user-123';
  const mockOrderId = '1';

  const mockOrder: Order = {
    id: mockOrderId,
    customerName: 'Test Customer',
    status: 'pending' as OrderStatus,
    currency: 'USD',
    amount: '100.00',
    orderDate: new Date('2024-01-15'),
    notes: 'Test order',
    organizationId: mockOrganizationId,
    userId: mockUserId,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  };

  const mockOrderWithJoins = {
    id: mockOrder.id,
    customerName: mockOrder.customerName,
    status: mockOrder.status,
    amount: mockOrder.amount,
    orderDate: mockOrder.orderDate,
    notes: mockOrder.notes,
    createdAt: mockOrder.createdAt,
    updatedAt: mockOrder.updatedAt,
    organizationName: 'Test Org',
    organizationSlug: 'test-org',
    userDisplayName: 'Test User',
    userEmail: 'test@example.com',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listOrders', () => {
    it('should list orders with default parameters', async () => {
      // Mock count query
      const mockSelect = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      // Mock orders query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockOrderWithJoins]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.listOrders({
        organizationId: mockOrganizationId,
      });

      expect(result).toEqual({
        orders: [mockOrderWithJoins],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it('should filter orders by status', async () => {
      const mockSelect = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockOrderWithJoins]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.listOrders({
        organizationId: mockOrganizationId,
        statuses: ['pending', 'processing'],
      });

      expect(result.orders).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it('should filter orders by search query', async () => {
      const mockSelect = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockOrderWithJoins]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.listOrders({
        organizationId: mockOrganizationId,
        searchQuery: 'Test Customer',
      });

      expect(result.orders).toHaveLength(1);
      expect(result.orders[0].customerName).toBe('Test Customer');
    });

    it('should filter orders by date range', async () => {
      const mockSelect = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockOrderWithJoins]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.listOrders({
        organizationId: mockOrganizationId,
        dateFrom: new Date('2024-01-01'),
        dateTo: new Date('2024-01-31'),
      });

      expect(result.orders).toHaveLength(1);
    });

    it('should filter orders by amount range', async () => {
      const mockSelect = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockOrderWithJoins]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.listOrders({
        organizationId: mockOrganizationId,
        minAmount: 50,
        maxAmount: 150,
      });

      expect(result.orders).toHaveLength(1);
    });

    it('should paginate orders correctly', async () => {
      const mockSelect = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 25 }]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockOrderWithJoins]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.listOrders({
        organizationId: mockOrganizationId,
        page: 2,
        limit: 10,
      });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(3);
    });

    it('should sort orders by amount ascending', async () => {
      const mockSelect = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockReturnValue({
                  limit: vi.fn().mockReturnValue({
                    offset: vi.fn().mockResolvedValue([mockOrderWithJoins]),
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.listOrders({
        organizationId: mockOrganizationId,
        sortBy: 'amount',
        sortOrder: 'asc',
      });

      expect(result.orders).toHaveLength(1);
    });
  });

  describe('getOrderById', () => {
    it('should return order when found', async () => {
      const mockOrderDetail = {
        id: mockOrder.id,
        customerName: mockOrder.customerName,
        status: mockOrder.status,
        currency: mockOrder.currency,
        amount: mockOrder.amount,
        orderDate: mockOrder.orderDate,
        notes: mockOrder.notes,
        createdAt: mockOrder.createdAt,
        updatedAt: mockOrder.updatedAt,
        organizationId: mockOrder.organizationId,
        userDisplayName: 'Test User',
        userEmail: 'test@example.com',
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockOrderDetail]),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.getOrderById({
        orderId: mockOrderId,
        organizationId: mockOrganizationId,
      });

      expect(result).toEqual(mockOrderDetail);
      expect(db.select).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        orderService.getOrderById({
          orderId: '999',
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow('Order not found');
    });
  });

  describe('getOrderHistory', () => {
    it('should return order history', async () => {
      const mockHistory = [
        {
          id: 1,
          status: 'pending' as OrderStatus,
          notes: 'Order created',
          createdAt: new Date('2024-01-15'),
          userDisplayName: 'Test User',
          userEmail: 'test@example.com',
        },
        {
          id: 2,
          status: 'processing' as OrderStatus,
          notes: 'Status changed from pending to processing',
          createdAt: new Date('2024-01-16'),
          userDisplayName: 'Test User',
          userEmail: 'test@example.com',
        },
      ];

      // Mock order check
      const mockSelect = vi.fn().mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockOrder]),
          }),
        }),
      });

      // Mock history query
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue(mockHistory),
            }),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.getOrderHistory({
        orderId: mockOrderId,
        organizationId: mockOrganizationId,
      });

      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(2);
      expect(db.select).toHaveBeenCalledTimes(2);
    });

    it('should throw error when order not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        orderService.getOrderHistory({
          orderId: '999',
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow('Order not found');
    });
  });

  describe('createOrder', () => {
    it('should create order with default status', async () => {
      const newOrderData = {
        customerName: 'New Customer',
        userId: mockUserId,
        organizationId: mockOrganizationId,
        amount: '200.00',
      };

      const mockInsert = vi.fn().mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockOrder]),
        }),
      });

      // Mock history insert
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await orderService.createOrder(newOrderData);

      expect(result).toEqual(mockOrder);
      expect(db.insert).toHaveBeenCalledTimes(2); // Once for order, once for history
    });

    it('should create order with custom status', async () => {
      const newOrderData = {
        customerName: 'New Customer',
        userId: mockUserId,
        organizationId: mockOrganizationId,
        status: 'processing' as OrderStatus,
        amount: '200.00',
        orderDate: new Date('2024-01-20'),
        notes: 'Custom order',
      };

      const mockOrderWithStatus = { ...mockOrder, status: 'processing' as OrderStatus };

      const mockInsert = vi.fn().mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockOrderWithStatus]),
        }),
      });

      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await orderService.createOrder(newOrderData);

      expect(result.status).toBe('processing');
      expect(db.insert).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateOrder', () => {
    it('should update order without status change', async () => {
      // Mock order check
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockOrder]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const updatedOrder = { ...mockOrder, customerName: 'Updated Customer' };

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedOrder]),
          }),
        }),
      });

      vi.mocked(db.update).mockImplementation(mockUpdate);

      const result = await orderService.updateOrder({
        orderId: mockOrderId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
        customerName: 'Updated Customer',
      });

      expect(result.customerName).toBe('Updated Customer');
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).not.toHaveBeenCalled(); // No history entry for non-status changes
    });

    it('should update order with status change and create history', async () => {
      // Mock order check
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockOrder]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const updatedOrder = { ...mockOrder, status: 'delivered' as OrderStatus };

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedOrder]),
          }),
        }),
      });

      vi.mocked(db.update).mockImplementation(mockUpdate);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert);

      const result = await orderService.updateOrder({
        orderId: mockOrderId,
        organizationId: mockOrganizationId,
        userId: mockUserId,
        status: 'delivered',
      });

      expect(result.status).toBe('delivered');
      expect(db.update).toHaveBeenCalled();
      expect(db.insert).toHaveBeenCalled(); // History entry created
    });

    it('should throw error when order not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        orderService.updateOrder({
          orderId: '999',
          organizationId: mockOrganizationId,
          userId: mockUserId,
          customerName: 'Updated Customer',
        })
      ).rejects.toThrow('Order not found');
    });
  });

  describe('deleteOrder', () => {
    it('should delete order successfully', async () => {
      // Mock order check
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockOrder]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const mockDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.delete).mockImplementation(mockDelete);

      const result = await orderService.deleteOrder({
        orderId: mockOrderId,
        organizationId: mockOrganizationId,
      });

      expect(result).toEqual({ success: true });
      expect(db.delete).toHaveBeenCalled();
    });

    it('should throw error when order not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        orderService.deleteOrder({
          orderId: '999',
          organizationId: mockOrganizationId,
        })
      ).rejects.toThrow('Order not found');

      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe('exportOrders', () => {
    it('should export orders as CSV', async () => {
      const mockOrders = [
        {
          id: '1',
          customerName: 'Customer 1',
          status: 'pending' as OrderStatus,
          amount: '100.00',
          orderDate: new Date('2024-01-15'),
          notes: 'Note 1',
          createdAt: new Date('2024-01-15'),
        },
        {
          id: '2',
          customerName: 'Customer 2',
          status: 'completed' as OrderStatus,
          amount: '200.00',
          orderDate: new Date('2024-01-16'),
          notes: null,
          createdAt: new Date('2024-01-16'),
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrders),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.exportOrders({
        organizationId: mockOrganizationId,
        type: 'csv',
      });

      expect(result.data).toBe('csv,data,here');
      expect(result.filename).toMatch(/^orders-\d{4}-\d{2}-\d{2}\.csv$/);
    });

    it('should export orders as Excel', async () => {
      const mockOrders = [
        {
          id: '1',
          customerName: 'Customer 1',
          status: 'pending' as OrderStatus,
          amount: '100.00',
          orderDate: new Date('2024-01-15'),
          notes: 'Note 1',
          createdAt: new Date('2024-01-15'),
        },
      ];

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockOrders),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      const result = await orderService.exportOrders({
        organizationId: mockOrganizationId,
        type: 'excel',
      });

      expect(result.data).toBe('base64data');
      expect(result.filename).toMatch(/^orders-\d{4}-\d{2}-\d{2}\.xlsx$/);
    });

    it('should throw error for unsupported export type', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect);

      await expect(
        orderService.exportOrders({
          organizationId: mockOrganizationId,
          type: 'pdf' as 'csv' | 'excel', // force type to test throw error
        })
      ).rejects.toThrow('Unsupported export type: pdf');
    });
  });
});
