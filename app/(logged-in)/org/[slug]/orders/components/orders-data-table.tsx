/**
 * Orders DataTable Component
 * Displays orders in a table with sorting, filtering, search, and pagination
 */

'use client';

import {
  MoreHorizontal,
  Edit,
  Trash,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Info,
  Hash,
  User,
  CircleDollarSign,
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { OrderStatus } from '@/lib/types';
import type { AppRouter } from '@/lib/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';
import { OrderFilters, ActiveFilterBadges } from './order-filters';
import { statusColors } from '../utils';

// Infer OrderWithDetails from tRPC router output
type RouterOutput = inferRouterOutputs<AppRouter>;
type OrderWithDetails = RouterOutput['orders']['list']['orders'][number];

interface OrdersDataTableProps {
  orders: OrderWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchQuery: string;
  sortBy: 'orderDate' | 'amount';
  sortOrder: 'asc' | 'desc';
  isLoading: boolean;
  // Filter props
  selectedStatuses: OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  minAmount: number;
  maxAmount: number;
  onStatusesChange: (statuses: OrderStatus[]) => void;
  onDateFromChange: (date?: Date) => void;
  onDateToChange: (date?: Date) => void;
  onAmountRangeChange: (min: number, max: number) => void;
  onClearFilters: () => void;
  // Action handlers
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (column: 'orderDate' | 'amount', order: 'asc' | 'desc') => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
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
  searchQuery,
  sortBy,
  sortOrder,
  isLoading,
  // Filter props
  selectedStatuses,
  dateFrom,
  dateTo,
  minAmount,
  maxAmount,
  onStatusesChange,
  onDateFromChange,
  onDateToChange,
  onAmountRangeChange,
  onClearFilters,
  // Action handlers
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onSortChange,
  onEdit,
  onDelete,
}: OrdersDataTableProps) {
  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(amount));
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  const handleSort = (column: 'orderDate' | 'amount') => {
    if (sortBy === column) {
      onSortChange(column, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(column, 'desc');
    }
  };

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

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
            selectedStatuses={selectedStatuses}
            dateFrom={dateFrom}
            dateTo={dateTo}
            minAmount={minAmount}
            maxAmount={maxAmount}
            onStatusesChange={onStatusesChange}
            onDateFromChange={onDateFromChange}
            onDateToChange={onDateToChange}
            onAmountRangeChange={onAmountRangeChange}
            onClearFilters={onClearFilters}
          />
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
              {searchQuery
                ? 'Try adjusting your filters'
                : 'Create your first order to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex gap-2 items-center">
                        <Hash size={16} />
                        Order
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex gap-2 items-center">
                        <User size={16} />
                        Customer
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex gap-2 items-center">
                        <Info size={16} />
                        Status
                      </div>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('orderDate')}>
                        <Calendar />
                        Date
                        {getSortIcon('orderDate')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort('amount')}>
                        <CircleDollarSign />
                        Amount
                        {getSortIcon('amount')}
                      </Button>
                    </TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id.substring(0, 8)}</TableCell>
                      <TableCell>
                        <div className="font-medium">{order.customerName}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[order.status]}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="pl-5">{formatDate(order.orderDate)}</TableCell>
                      <TableCell className="font-medium pl-5">
                        {formatCurrency(order.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit(order.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onDelete(order.id)}
                              className="text-red-600"
                            >
                              <Trash className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex} to {endIndex} of {total} orders
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => onPageSizeChange(Number(value))}
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 / page</SelectItem>
                    <SelectItem value="20">20 / page</SelectItem>
                    <SelectItem value="50">50 / page</SelectItem>
                    <SelectItem value="100">100 / page</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page === 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft />
                  </Button>
                  <div className="text-sm px-2">
                    Page {page} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
