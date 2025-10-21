/**
 * Organization Orders Page
 * Displays orders in a DataTable with server-side filtering, search, pagination, and sorting
 */

'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrders } from '@/hooks/use-orders';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { OrderStatus } from '@/lib/types';
import { OrdersDataTable } from './components/orders-data-table';
import { OrderStats } from './components/order-stats';
import { OrderDialog } from './components/order-dialog';

// Skeleton components
function OrdersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrgOrdersPage() {
  const { activeOrganization, isLoading: isLoadingOrg } = useActiveOrganization();
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [minAmount, setMinAmount] = useState(0);
  const [maxAmount, setMaxAmount] = useState(10000);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<'orderDate' | 'amount'>('orderDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const {
    orders,
    total,
    totalPages,
    stats,
    isLoading,
    isLoadingStats,
    createOrder,
    updateOrder,
    deleteOrder,
    exportOrders,
    isCreating,
    isUpdating,
    isDeleting,
    isExporting,
  } = useOrders({
    organizationId: activeOrganization?.id ?? '',
    statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    searchQuery: searchQuery.trim() || undefined,
    dateFrom,
    // Adjust dateTo to include the entire end date (date picker returns midnight, we need end of day)
    dateTo: dateTo ? new Date(new Date(dateTo).setHours(23, 59, 59, 999)) : undefined,
    minAmount: minAmount > 0 ? minAmount : undefined,
    maxAmount: maxAmount < 10000 ? maxAmount : undefined,
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  });

  const handleClearFilters = () => {
    setSelectedStatuses([]);
    setDateFrom(undefined);
    setDateTo(undefined);
    setMinAmount(0);
    setMaxAmount(10000);
    setPage(1);
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const handleDeleteOrder = async () => {
    if (!selectedOrderId) return;
    await deleteOrder(selectedOrderId);
    setDeleteDialogOpen(false);
    setSelectedOrderId(null);
  };

  const handleEditClick = (id: string) => {
    setSelectedOrderId(id);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setSelectedOrderId(id);
    setDeleteDialogOpen(true);
  };

  if (isLoadingOrg || (isLoading && page === 1)) {
    return <OrdersPageSkeleton />;
  }

  if (!activeOrganization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">No organization selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">Manage orders for {activeOrganization.name}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Stats Cards */}
      <OrderStats stats={stats} isLoading={isLoadingStats} />

      {/* Orders DataTable */}
      <OrdersDataTable
        orders={orders}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        searchQuery={searchQuery}
        sortBy={sortBy}
        sortOrder={sortOrder}
        isLoading={isLoading}
        // Filter props
        selectedStatuses={selectedStatuses}
        dateFrom={dateFrom}
        dateTo={dateTo}
        minAmount={minAmount}
        maxAmount={maxAmount}
        onStatusesChange={(statuses) => {
          setSelectedStatuses(statuses);
          setPage(1);
        }}
        onDateFromChange={(date) => {
          setDateFrom(date);
          setPage(1);
        }}
        onDateToChange={(date) => {
          setDateTo(date);
          setPage(1);
        }}
        onAmountRangeChange={(min, max) => {
          setMinAmount(min);
          setMaxAmount(max);
          setPage(1);
        }}
        onClearFilters={handleClearFilters}
        // Action handlers
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        onSearchChange={(query) => {
          setSearchQuery(query);
          setPage(1);
        }}
        onSortChange={(column, order) => {
          setSortBy(column);
          setSortOrder(order);
        }}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        // Export handler
        onExport={(type) => exportOrders({ organizationId: activeOrganization?.id ?? '', type })}
        isExporting={isExporting}
      />

      {/* Create Order Dialog */}
      <OrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={async (values) => {
          await createOrder({
            ...values,
            organizationId: activeOrganization.id,
          });
        }}
        mode="create"
        isSubmitting={isCreating}
      />

      {/* Edit Order Dialog */}
      <OrderDialog
        key={selectedOrder?.id}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={async (values) => {
          if (!selectedOrderId) return;
          await updateOrder({ id: selectedOrderId, ...values });
        }}
        initialValues={
          selectedOrder
            ? {
                customerName: selectedOrder.customerName,
                amount: parseFloat(selectedOrder.amount), // Convert string to number for form
                status: selectedOrder.status,
                orderDate: selectedOrder.orderDate,
                notes: selectedOrder.notes ?? undefined,
              }
            : undefined
        }
        mode="edit"
        isSubmitting={isUpdating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this order. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
