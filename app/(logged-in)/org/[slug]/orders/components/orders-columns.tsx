/**
 * Orders Table Column Definitions
 * Defines columns for the orders data table with server-side sorting
 */

'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
  MoreHorizontal,
  Edit,
  Trash,
  Hash,
  User,
  Info,
  Calendar,
  CircleDollarSign,
  Eye,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { AppRouter } from '@/lib/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';
import { DataTableColumnHeader } from './data-table-column-header';
import { statusColors } from '../utils';

// Infer OrderWithDetails from tRPC router output
type RouterOutput = inferRouterOutputs<AppRouter>;
type OrderWithDetails = RouterOutput['orders']['list']['orders'][number];

interface ColumnActionsProps {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

interface ColumnSortingProps {
  sortBy: 'orderDate' | 'amount';
  sortOrder: 'asc' | 'desc';
  onSort: (column: 'orderDate' | 'amount') => void;
}

interface ColumnSelectionProps {
  enableRowSelection?: boolean;
}

export function getOrderColumns(
  actions: ColumnActionsProps,
  sorting: ColumnSortingProps,
  selection?: ColumnSelectionProps
): ColumnDef<OrderWithDetails>[] {
  const { onView, onEdit, onDelete } = actions;
  const { sortBy, sortOrder, onSort } = sorting;
  const { enableRowSelection = true } = selection || {};

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

  const columns: ColumnDef<OrderWithDetails>[] = [];

  if (enableRowSelection) {
    columns.push({
      id: 'select',
      header: ({ table }) => {
        return (
          <Checkbox
            checked={table.getIsSomeRowsSelected() ? 'indeterminate' : table.getIsAllRowsSelected()}
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        );
      },
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          disabled={!row.getCanSelect()}
          onCheckedChange={row.getToggleSelectedHandler()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    });
  }

  // Add regular columns
  columns.push(
    {
      accessorKey: 'id',
      header: () => <DataTableColumnHeader title="Order" icon={<Hash size={16} />} />,
      cell: ({ row }) => row.original.id,
    },
    {
      accessorKey: 'customerName',
      header: () => <DataTableColumnHeader title="Customer" icon={<User size={16} />} />,
      cell: ({ row }) => row.original.customerName,
    },
    {
      accessorKey: 'status',
      header: () => <DataTableColumnHeader title="Status" icon={<Info size={16} />} />,
      cell: ({ row }) => (
        <Badge className={statusColors[row.original.status]}>{row.original.status}</Badge>
      ),
    },
    {
      accessorKey: 'amount',
      header: () => (
        <DataTableColumnHeader
          title="Amount"
          icon={<CircleDollarSign size={16} />}
          sortable
          sortDirection={sortBy === 'amount' ? sortOrder : false}
          onSort={() => onSort('amount')}
        />
      ),
      cell: ({ row }) => formatCurrency(row.original.amount),
    },
    {
      accessorKey: 'orderDate',
      header: () => (
        <DataTableColumnHeader
          title="Date"
          icon={<Calendar size={16} />}
          sortable
          sortDirection={sortBy === 'orderDate' ? sortOrder : false}
          onSort={() => onSort('orderDate')}
        />
      ),
      cell: ({ row }) => formatDate(row.original.orderDate),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const order = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onView(order.id);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(order.id);
                }}
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(order.id);
                }}
                className="text-red-600"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }
  );

  return columns;
}
