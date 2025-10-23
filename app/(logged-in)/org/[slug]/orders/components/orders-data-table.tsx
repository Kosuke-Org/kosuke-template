/**
 * Orders DataTable Component
 * TanStack Table implementation with server-side pagination, sorting, and filtering
 */

'use client';

import * as React from 'react';
import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Search, X, ChevronDown, Loader2 } from 'lucide-react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { AppRouter } from '@/lib/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';
import type { OrderStatus } from '@/lib/types';
import { exportTypeEnum, type ExportType } from '@/lib/trpc/schemas/orders';
import { getOrderColumns } from './orders-columns';
import { DataTablePagination } from './data-table-pagination';
import { OrderFilters, ActiveFilterBadges } from './order-filters';
import { MAX_AMOUNT } from '../utils';

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
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
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
}: OrdersDataTableProps) {
  const columns = React.useMemo(
    () =>
      getOrderColumns({ onView, onEdit, onDelete }, { sortBy, sortOrder, onSort: onSortChange }),
    [onView, onEdit, onDelete, sortBy, sortOrder, onSortChange]
  );

  const table = useReactTable({
    data: orders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  });

  const activeFiltersCount =
    selectedStatuses.length +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (minAmount > 0 || maxAmount < MAX_AMOUNT ? 1 : 0);

  return (
    <Card>
      <CardHeader className="pb-3 space-y-3">
        {/* Search and Filters Row */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-[400px] lg:w-[500px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                  {isExporting && <Loader2 className="animate-spin" />}
                  Export
                  <ChevronDown />
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
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TableSkeleton />
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="font-semibold text-lg mb-1">No orders found</h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery || activeFiltersCount > 0
                ? 'Try adjusting your filters'
                : 'Create your first order to get started'}
            </p>
          </div>
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
                        onClick={() => onView(row.original.id)}
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
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <DataTablePagination
              table={table}
              totalRecords={total}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
