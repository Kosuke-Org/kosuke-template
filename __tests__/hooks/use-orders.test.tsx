/**
 * Tests for use-orders hook
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useOrderActions, useOrdersList } from '@/hooks/use-orders';
import { trpc } from '@/lib/trpc/client';
import { vi, type Mock } from 'vitest';

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
    dismiss: vi.fn(),
  }),
}));

// Mock the trpc client
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    orders: {
      list: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
      update: {
        useMutation: vi.fn(),
      },
      delete: {
        useMutation: vi.fn(),
      },
      getStats: {
        useQuery: vi.fn(),
      },
      export: {
        useMutation: vi.fn(),
      },
    },
    useUtils: () => ({
      orders: {
        list: {
          invalidate: vi.fn(),
          setData: vi.fn(),
          getData: vi.fn(),
        },
        getStats: {
          invalidate: vi.fn(),
        },
      },
    }),
  },
}));

describe('useOrdersList', () => {
  let queryClient: QueryClient;

  // Mock data used across tests
  const mockOrders = [
    {
      id: 'order_1',
      organizationId: 'org_123',
      clerkUserId: 'user_123',
      customerName: 'John Doe',
      amount: '500.00',
      currency: 'USD',
      status: 'pending' as const,
      notes: 'Test order 1',
      orderDate: new Date('2025-01-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'order_2',
      organizationId: 'org_123',
      clerkUserId: 'user_123',
      customerName: 'Jane Smith',
      amount: '750.00',
      currency: 'USD',
      status: 'completed' as const,
      notes: null,
      orderDate: new Date('2025-01-20'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockOrdersData = {
    orders: mockOrders,
    total: 2,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  const mockStats = {
    totalOrders: 100,
    totalRevenue: '50000.00',
    averageOrderValue: '500.00',
    pendingOrders: 20,
    completedOrders: 60,
    cancelledOrders: 20,
  };

  const defaultFilters = {
    organizationId: 'org_123',
    page: 1,
    limit: 10,
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();

    // Setup default query mocks (needed for most tests)
    (trpc.orders.list.useQuery as Mock).mockReturnValue({
      data: mockOrdersData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    (trpc.orders.getStats.useQuery as Mock).mockReturnValue({
      data: mockStats,
      isLoading: false,
    });

    // Setup default mutation mocks (needed since the hook returns them)
    (trpc.orders.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.orders.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.orders.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    (trpc.orders.export.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should fetch orders successfully', async () => {
    const { result } = renderHook(() => useOrdersList(defaultFilters), { wrapper });

    await waitFor(() => {
      expect(result.current.orders).toEqual(mockOrders);
      expect(result.current.total).toBe(2);
      expect(result.current.page).toBe(1);
      expect(result.current.limit).toBe(10);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should fetch order statistics successfully', async () => {
    const { result } = renderHook(() => useOrdersList(defaultFilters), { wrapper });

    await waitFor(() => {
      expect(result.current.stats).toEqual(mockStats);
      expect(result.current.isLoadingStats).toBe(false);
    });
  });

  it('should create order successfully', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'order_3',
      organizationId: 'org_123',
      clerkUserId: 'user_123',
      customerName: 'Bob Johnson',
      amount: '225.00',
      currency: 'USD',
      status: 'pending',
      notes: 'New order',
      orderDate: new Date('2025-01-25'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Override create mutation for this test
    (trpc.orders.create.useMutation as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useOrderActions(), { wrapper });

    await result.current.createOrder({
      organizationId: 'org_123',
      customerName: 'Bob Johnson',
      amount: '225.00',
      notes: 'New order',
      orderDate: new Date('2025-01-25'),
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      organizationId: 'org_123',
      customerName: 'Bob Johnson',
      amount: '225.00',
      notes: 'New order',
      orderDate: expect.any(Date),
    });
  });

  it('should update order successfully', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({
      id: 'order_1',
      organizationId: 'org_123',
      clerkUserId: 'user_123',
      customerName: 'John Doe Updated',
      amount: '750.00',
      currency: 'USD',
      status: 'completed',
      notes: 'Updated order',
      orderDate: new Date('2025-01-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Override update mutation for this test
    (trpc.orders.update.useMutation as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useOrderActions(), { wrapper });

    await result.current.updateOrder({
      organizationId: 'org_123',
      id: 'order_1',
      customerName: 'John Doe Updated',
      amount: '750.00',
      status: 'completed',
      notes: 'Updated order',
    });

    expect(mockMutateAsync).toHaveBeenCalledWith({
      organizationId: 'org_123',
      id: 'order_1',
      customerName: 'John Doe Updated',
      amount: '750.00',
      status: 'completed',
      notes: 'Updated order',
    });
  });

  it('should delete order successfully', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });

    // Override delete mutation for this test
    (trpc.orders.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const { result } = renderHook(() => useOrderActions(), { wrapper });

    await result.current.deleteOrder({ id: 'order_1', organizationId: 'org_123' });

    expect(mockMutateAsync).toHaveBeenCalledWith({ id: 'order_1', organizationId: 'org_123' });
  });

  it('should filter orders by status', () => {
    (trpc.orders.list.useQuery as Mock).mockImplementation((filters) => ({
      data: filters?.statuses?.includes('pending')
        ? { ...mockOrdersData, orders: [mockOrders[0]] }
        : mockOrdersData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    }));

    renderHook(() => useOrdersList({ ...defaultFilters, statuses: ['pending'] }), { wrapper });

    expect(trpc.orders.list.useQuery).toHaveBeenCalledWith(
      { ...defaultFilters, statuses: ['pending'] },
      expect.any(Object)
    );
  });

  it('should filter orders by date range', () => {
    const dateFrom = new Date('2025-01-01');
    const dateTo = new Date('2025-01-31');

    renderHook(() => useOrdersList({ ...defaultFilters, dateFrom, dateTo }), { wrapper });

    expect(trpc.orders.list.useQuery).toHaveBeenCalledWith(
      { ...defaultFilters, dateFrom, dateTo },
      expect.any(Object)
    );
  });

  it('should handle server-side search', () => {
    const searchQuery = 'Product A';

    // Override to return filtered results
    (trpc.orders.list.useQuery as Mock).mockReturnValue({
      data: { ...mockOrdersData, orders: [mockOrders[0]] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useOrdersList({ ...defaultFilters, searchQuery }), {
      wrapper,
    });

    expect(trpc.orders.list.useQuery).toHaveBeenCalledWith(
      { ...defaultFilters, searchQuery },
      expect.any(Object)
    );
    expect(result.current.orders).toHaveLength(1);
  });

  it('should handle pagination', () => {
    // Override to show different page
    (trpc.orders.list.useQuery as Mock).mockReturnValue({
      data: { ...mockOrdersData, page: 2, totalPages: 5 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useOrdersList({ ...defaultFilters, page: 2 }), { wrapper });

    expect(result.current.page).toBe(2);
    expect(result.current.totalPages).toBe(5);
  });

  it('should handle server-side sorting', () => {
    renderHook(
      () =>
        useOrdersList({
          ...defaultFilters,
          sortBy: 'orderDate',
          sortOrder: 'desc',
        }),
      { wrapper }
    );

    expect(trpc.orders.list.useQuery).toHaveBeenCalledWith(
      {
        ...defaultFilters,
        sortBy: 'orderDate',
        sortOrder: 'desc',
      },
      expect.any(Object)
    );
  });

  it('should handle combined filters (statuses + search + date range + sorting)', () => {
    const dateFrom = new Date('2025-01-01');
    const dateTo = new Date('2025-01-31');

    renderHook(
      () =>
        useOrdersList({
          ...defaultFilters,
          statuses: ['completed'],
          searchQuery: 'Product',
          dateFrom,
          dateTo,
          sortBy: 'amount',
          sortOrder: 'desc',
        }),
      { wrapper }
    );

    expect(trpc.orders.list.useQuery).toHaveBeenCalledWith(
      {
        ...defaultFilters,
        statuses: ['completed'],
        searchQuery: 'Product',
        dateFrom,
        dateTo,
        sortBy: 'amount',
        sortOrder: 'desc',
      },
      expect.any(Object)
    );
  });

  it('should handle mutation loading states', () => {
    // Override mutations to show pending state
    (trpc.orders.create.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });
    (trpc.orders.update.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });
    (trpc.orders.delete.useMutation as Mock).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });

    const { result } = renderHook(() => useOrderActions(), { wrapper });

    expect(result.current.isCreating).toBe(true);
    expect(result.current.isUpdating).toBe(true);
    expect(result.current.isDeleting).toBe(true);
  });

  it('should handle error state', () => {
    const mockError = new Error('Failed to fetch orders');

    // Override to show error state
    (trpc.orders.list.useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
      refetch: vi.fn(),
    });

    (trpc.orders.getStats.useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useOrdersList(defaultFilters), { wrapper });

    expect(result.current.error).toEqual(mockError);
    expect(result.current.orders).toEqual([]);
  });

  it('should preserve previous data during refetch (placeholderData)', () => {
    const { result } = renderHook(() => useOrdersList(defaultFilters), { wrapper });

    expect(trpc.orders.list.useQuery).toHaveBeenCalledWith(
      defaultFilters,
      expect.objectContaining({
        staleTime: 1000 * 60 * 2,
        placeholderData: expect.any(Function),
        enabled: true,
      })
    );

    expect(result.current.orders).toEqual(mockOrders);
  });

  it('should not fetch orders when organizationId is missing', () => {
    const invalidFilters = {
      organizationId: '',
      page: 1,
      limit: 10,
    };

    // Override to show no data
    (trpc.orders.list.useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    (trpc.orders.getStats.useQuery as Mock).mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useOrdersList(invalidFilters), { wrapper });

    expect(trpc.orders.list.useQuery).toHaveBeenCalledWith(
      invalidFilters,
      expect.objectContaining({
        enabled: false, // Should be disabled when organizationId is empty
      })
    );

    expect(result.current.orders).toEqual([]);
  });
});
