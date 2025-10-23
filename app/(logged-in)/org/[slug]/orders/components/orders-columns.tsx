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

export function getOrderColumns(
  actions: ColumnActionsProps,
  sorting: ColumnSortingProps
): ColumnDef<OrderWithDetails>[] {
  const { onView, onEdit, onDelete } = actions;
  const { sortBy, sortOrder, onSort } = sorting;

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

  return [
    {
      accessorKey: 'id',
      header: () => <DataTableColumnHeader title="Order" icon={<Hash size={16} />} />,
      cell: ({ row }) => <div className="font-medium">{row.getValue('id')}</div>,
    },
    {
      accessorKey: 'customerName',
      header: () => <DataTableColumnHeader title="Customer" icon={<User size={16} />} />,
      cell: ({ row }) => <div>{row.getValue('customerName')}</div>,
    },
    {
      accessorKey: 'status',
      header: () => <DataTableColumnHeader title="Status" icon={<Info size={16} />} />,
      cell: ({ row }) => {
        const status = row.getValue('status') as keyof typeof statusColors;
        return <Badge className={statusColors[status]}>{status}</Badge>;
      },
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
      cell: ({ row }) => {
        const amount = row.getValue('amount') as string;
        return <div className="pl-2">{formatCurrency(amount)}</div>;
      },
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
      cell: ({ row }) => {
        const date = row.getValue('orderDate') as Date;
        return <div className="pl-2">{formatDate(date)}</div>;
      },
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
    },
  ];
}
