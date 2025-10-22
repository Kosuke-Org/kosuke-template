/**
 * Custom hooks for order operations
 * Uses tRPC for type-safe order management with inferred types
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { downloadFile } from '@/lib/utils';
import type { AppRouter } from '@/lib/trpc/router';
import type { inferRouterInputs } from '@trpc/server';
import type { ExportType } from '@/lib/trpc/schemas/orders';

// Infer types from tRPC router - no need for manual type definitions!
type RouterInput = inferRouterInputs<AppRouter>;
type CreateOrderInput = RouterInput['orders']['create'];
type UpdateOrderInput = RouterInput['orders']['update'];
type OrderListFilters = RouterInput['orders']['list'];
type DeleteOrderInput = RouterInput['orders']['delete'];

/**
 * Hook for order list operations (queries)
 */
export function useOrdersList(filters: OrderListFilters) {
  const {
    data: ordersData,
    isLoading,
    error,
  } = trpc.orders.list.useQuery(filters, {
    staleTime: 1000 * 60 * 2, // 2 minutes
    placeholderData: (previousData) => previousData,
    enabled: !!filters?.organizationId,
  });

  const { data: stats, isLoading: isLoadingStats } = trpc.orders.getStats.useQuery(
    {
      organizationId: filters?.organizationId ?? '',
    },
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      enabled: !!filters?.organizationId,
    }
  );

  return {
    orders: ordersData?.orders ?? [],
    total: ordersData?.total ?? 0,
    page: ordersData?.page ?? 1,
    limit: ordersData?.limit ?? 10,
    totalPages: ordersData?.totalPages ?? 0,
    stats,
    isLoading,
    isLoadingStats,
    error,
  };
}

/**
 * Hook for order mutations (create, update, delete, export)
 */
export function useOrderActions() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order created successfully',
      });
      utils.orders.getStats.invalidate();
      utils.orders.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create order',
        variant: 'destructive',
      });
    },
  });

  const updateOrder = trpc.orders.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order updated successfully',
      });
      utils.orders.list.invalidate();
      utils.orders.getStats.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update order',
        variant: 'destructive',
      });
    },
  });

  const deleteOrder = trpc.orders.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Order deleted successfully',
      });
      utils.orders.getStats.invalidate();
      utils.orders.list.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete order',
        variant: 'destructive',
      });
    },
  });

  const exportOrders = trpc.orders.export.useMutation({
    onSuccess: (data, variables) => {
      downloadFile(data.data, data.filename);

      toast({
        title: 'Success',
        description: `Orders exported as ${variables.type.toUpperCase()}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to export orders',
        variant: 'destructive',
      });
    },
  });

  return {
    createOrder: (input: CreateOrderInput) => createOrder.mutateAsync(input),
    updateOrder: (input: UpdateOrderInput) => updateOrder.mutateAsync(input),
    deleteOrder: (input: DeleteOrderInput) => deleteOrder.mutateAsync(input),
    exportOrders: ({ type, organizationId }: { type: ExportType; organizationId: string }) =>
      exportOrders.mutateAsync({ type, organizationId }),
    isCreating: createOrder.isPending,
    isUpdating: updateOrder.isPending,
    isDeleting: deleteOrder.isPending,
    isExporting: exportOrders.isPending,
  };
}
