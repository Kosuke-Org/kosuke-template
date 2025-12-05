/**
 * Orders DataTable Component
 * TanStack Table implementation with server-side pagination, sorting, and filtering
 */

'use client';

import { useCallback, useMemo } from 'react';

import {
  RowSelectionState,
  Updater,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import { Download, Loader2, Search, Trash2, X } from 'lucide-react';

import type { AppRouter } from '@/lib/trpc/router';
import { type ExportType, exportTypeEnum } from '@/lib/trpc/schemas/orders';
import type { OrderStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { TableSkeleton } from '@/components/data-table/data-table-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { MAX_AMOUNT } from '../utils';
import { ActiveFilterBadges, OrderFilters } from './order-filters';
import { getOrderColumns } from './orders-columns';

// Infer OrderWithDetails from tRPC router output
type RouterOutput = inferRouterOutputs<AppRouter>;
type OrderWithDetails = RouterOutput['orders']['list']['orders'][number];

interface OrdersDataTableProps {
  orders: OrderWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  // Filter props
  searchQuery: string;
  selectedStatuses: OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount: number;
  maxAmount: number;
  // Sorting props
  sortBy: 'orderDate' | 'amount';
  sortOrder: 'asc' | 'desc';
  onSearchChange: (query: string) => void;
  onStatusesChange: (statuses: OrderStatus[]) => void;
  onDateFromChange: (date?: Date) => void;
  onDateToChange: (date?: Date) => void;
  onAmountRangeChange: (min: number, max: number) => void;
  onClearFilters: () => void;
  onSortChange: (column: 'orderDate' | 'amount') => void;
  // Pagination handlers
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  // Action handlers
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  // Export handler
  onExport: (type: ExportType) => void;
  isExporting: boolean;
  // Row selection props
  selectedRowIds?: string[];
  onRowSelectionChange?: (selectedRowIds: string[]) => void;
  onBulkDelete?: (selectedRowIds: string[]) => void;
}

export function OrdersDataTable({
  orders,
  total,
  page,
  pageSize,
  totalPages,
  isLoading,
  searchQuery,
  selectedStatuses,
  dateFrom,
  dateTo,
  minAmount,
  maxAmount,
  sortBy,
  sortOrder,
  onSearchChange,
  onStatusesChange,
  onDateFromChange,
  onDateToChange,
  onAmountRangeChange,
  onClearFilters,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  onExport,
  isExporting,
  selectedRowIds = [],
  onRowSelectionChange,
  onBulkDelete,
}: OrdersDataTableProps) {
  const rowSelection = useMemo(() => {
    const newRowSelection: Record<string, boolean> = {};
    selectedRowIds.forEach((id) => {
      newRowSelection[id] = true;
    });
    return newRowSelection;
  }, [selectedRowIds]);

  const handleRowSelectionChange = useCallback(
    (updaterOrValue: Updater<RowSelectionState>) => {
      const newRowSelection =
        typeof updaterOrValue === 'function' ? updaterOrValue(rowSelection) : updaterOrValue;

      const selectedIds = Object.keys(newRowSelection).filter((key) => newRowSelection[key]);
      onRowSelectionChange?.(selectedIds);
    },
    [rowSelection, onRowSelectionChange]
  );

  const columns = useMemo(
    () =>
      getOrderColumns({ onView, onEdit, onDelete }, { sortBy, sortOrder, onSort: onSortChange }),
    [onView, onEdit, onDelete, sortBy, sortOrder, onSortChange]
  );

  // eslint-disable-next-line
  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onRowSelectionChange: handleRowSelectionChange,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
      rowSelection,
    },
  });

  const activeFiltersCount =
    selectedStatuses.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (minAmount > 0 || maxAmount < MAX_AMOUNT ? 1 : 0);

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const hasSelectedRows = selectedRows.length > 0;

  return (
    <>
      {/* Bulk Actions Bar */}
      {hasSelectedRows && (
        <div className="bg-muted/50 flex items-center gap-2 rounded-md border p-3">
          <span className="text-sm font-medium">
            {selectedRows.length} row{selectedRows.length > 1 ? 's' : ''} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            {onBulkDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onBulkDelete(selectedRows.map((row) => row.original.id))}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-[400px] lg:w-[500px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by customer name or order ID..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <OrderFilters
          activeFiltersCount={activeFiltersCount}
          selectedStatuses={selectedStatuses}
          dateFrom={dateFrom}
          dateTo={dateTo}
          minAmount={minAmount}
          maxAmount={maxAmount}
          onStatusesChange={onStatusesChange}
          onDateFromChange={onDateFromChange}
          onDateToChange={onDateToChange}
          onAmountRangeChange={onAmountRangeChange}
        />
        {activeFiltersCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            <X />
            Clear all
          </Button>
        )}
        <div className="ml-auto">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" disabled={isExporting}>
                <Loader2 className={cn('hidden animate-spin', isExporting && 'block')} />
                <Download className={cn('block', isExporting && 'hidden')} />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-30 p-2" align="end">
              {exportTypeEnum.options.map((type) => (
                <Button
                  key={type}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => onExport(type)}
                  disabled={isExporting}
                >
                  {type.toUpperCase()}
                </Button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters Badges */}
      <ActiveFilterBadges
        selectedStatuses={selectedStatuses}
        dateFrom={dateFrom}
        dateTo={dateTo}
        minAmount={minAmount}
        maxAmount={maxAmount}
        onStatusesChange={onStatusesChange}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        onAmountRangeChange={onAmountRangeChange}
      />
      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (
                          target.closest('[role="checkbox"]') ||
                          target.closest('[role="menuitem"]') ||
                          target.closest('button')
                        ) {
                          return;
                        }
                        onView(row.original.id);
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No results.{' '}
                      {searchQuery || activeFiltersCount > 0
                        ? 'Try adjusting your filters'
                        : 'Create your first order to get started'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {orders.length > 0 && (
            <DataTablePagination
              table={table}
              totalRecords={total}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          )}
        </div>
      )}
    </>
  );
}
