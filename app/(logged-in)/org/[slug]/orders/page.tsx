/**
 * Organization Orders Page
 * Displays orders in a DataTable with server-side filtering, search, pagination, and sorting
 */

'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { Plus } from 'lucide-react';

import type { OrderStatus } from '@/lib/types';

import { useOrderActions, useOrdersList } from '@/hooks/use-orders';
import { useOrganization } from '@/hooks/use-organization';
import { useTableFilters } from '@/hooks/use-table-filters';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { useTableRowSelection } from '@/hooks/use-table-row-selection';
import { useTableSearch } from '@/hooks/use-table-search';
import { useTableSorting } from '@/hooks/use-table-sorting';

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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { OrderDialog } from './components/order-dialog';
import { OrdersDataTable } from './components/orders-data-table';

// Skeleton components
function OrdersPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-6 w-96" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}

export default function OrgOrdersPage() {
  const router = useRouter();
  const { organization: activeOrganization, isLoading: isLoadingOrg } = useOrganization();

  // Reusable table hooks
  const { searchValue, setSearchValue } = useTableSearch({
    initialValue: '',
    debounceMs: 300,
    onSearchChange: () => {}, // Actual search happens via searchValue in query
  });

  const { sortBy, sortOrder, handleSort } = useTableSorting<'orderDate' | 'amount'>({
    initialSortBy: 'orderDate',
    initialSortOrder: 'desc',
  });

  const { page, pageSize, setPage, setPageSize, goToFirstPage } = useTablePagination({
    initialPage: 1,
    initialPageSize: 10,
  });

  const { filters, updateFilter, resetFilters } = useTableFilters({
    selectedStatuses: [] as OrderStatus[],
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    minAmount: 0,
    maxAmount: 10000,
  });

  const rowSelection = useTableRowSelection();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  const { orders, total, totalPages, isLoading } = useOrdersList({
    organizationId: activeOrganization?.id ?? '',
    statuses: filters.selectedStatuses.length > 0 ? filters.selectedStatuses : undefined,
    searchQuery: searchValue.trim() || undefined,
    dateFrom: filters.dateFrom,
    // Adjust dateTo to include the entire end date (date picker returns midnight, we need end of day)
    dateTo: filters.dateTo
      ? new Date(new Date(filters.dateTo).setHours(23, 59, 59, 999))
      : undefined,
    minAmount: filters.minAmount > 0 ? filters.minAmount : undefined,
    maxAmount: filters.maxAmount < 10000 ? filters.maxAmount : undefined,
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  });

  const {
    createOrder,
    updateOrder,
    deleteOrder,
    exportOrders,
    isCreating,
    isUpdating,
    isDeleting,
    isExporting,
  } = useOrderActions();

  const handleClearFilters = () => {
    resetFilters();
    goToFirstPage();
  };

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  const handleDeleteOrder = async () => {
    if (!selectedOrderId || !activeOrganization) return;
    await deleteOrder({ id: selectedOrderId, organizationId: activeOrganization.id });
    setDeleteDialogOpen(false);
    setSelectedOrderId(null);
  };

  const handleViewClick = (id: string) => {
    if (!activeOrganization) return;
    router.push(`/org/${activeOrganization.slug}/orders/${id}`);
  };

  const handleEditClick = (id: string) => {
    setSelectedOrderId(id);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setSelectedOrderId(id);
    setDeleteDialogOpen(true);
  };

  if (isLoadingOrg || (isLoading && page === 1) || !activeOrganization) {
    return <OrdersPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage orders for your organization</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Orders DataTable */}
      <OrdersDataTable
        orders={orders}
        total={total}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        isLoading={isLoading}
        // Filter props
        searchQuery={searchValue}
        selectedStatuses={filters.selectedStatuses}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        minAmount={filters.minAmount}
        maxAmount={filters.maxAmount}
        // Sorting props
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSearchChange={setSearchValue}
        onStatusesChange={(statuses) => {
          updateFilter('selectedStatuses', statuses);
          goToFirstPage();
        }}
        onDateFromChange={(date) => {
          updateFilter('dateFrom', date);
          goToFirstPage();
        }}
        onDateToChange={(date) => {
          updateFilter('dateTo', date);
          goToFirstPage();
        }}
        onAmountRangeChange={(min, max) => {
          updateFilter('minAmount', min);
          updateFilter('maxAmount', max);
          goToFirstPage();
        }}
        onClearFilters={handleClearFilters}
        onSortChange={handleSort}
        // Pagination handlers
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        // Action handlers
        onView={handleViewClick}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        // Export handler
        onExport={(type) => {
          if (!activeOrganization) return;
          exportOrders({ type, organizationId: activeOrganization.id });
        }}
        isExporting={isExporting}
        selectedRowIds={rowSelection.selectedRowIds}
        onRowSelectionChange={rowSelection.setSelectedRowIds}
        onBulkDelete={async (ids) => {
          for (const id of ids) {
            await deleteOrder({ id, organizationId: activeOrganization.id });
          }
          rowSelection.clearSelection();
        }}
      />

      {/* Create Order Dialog */}
      <OrderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={async (values) => {
          if (!activeOrganization) return;
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
          if (!selectedOrderId || !activeOrganization) return;

          await updateOrder({
            id: selectedOrderId,
            organizationId: activeOrganization.id,
            ...values,
          });
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
