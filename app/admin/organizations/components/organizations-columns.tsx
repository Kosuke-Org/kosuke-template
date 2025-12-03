/**
 * Organizations Table Column Definitions
 * Defines columns for the organizations data table
 */

'use client';

import { ColumnDef } from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import { format } from 'date-fns';
import { Building2, MoreHorizontal, Trash2 } from 'lucide-react';

import type { AppRouter } from '@/lib/trpc/router';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Infer OrganizationWithDetails from tRPC router output
type RouterOutput = inferRouterOutputs<AppRouter>;
type OrganizationWithDetails =
  RouterOutput['admin']['organizations']['list']['organizations'][number];

interface ColumnActionsProps {
  onView: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function getOrganizationColumns(
  actions: ColumnActionsProps
): ColumnDef<OrganizationWithDetails>[] {
  const { onView, onDelete } = actions;

  const columns: ColumnDef<OrganizationWithDetails>[] = [
    {
      accessorKey: 'name',
      header: () => <DataTableColumnHeader title="Name" />,
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: 'slug',
      header: () => <DataTableColumnHeader title="Slug" />,
      cell: ({ row }) => row.original.slug,
    },
    {
      accessorKey: 'memberCount',
      header: () => <DataTableColumnHeader title="Members" />,
      cell: ({ row }) => row.original.memberCount,
    },
    {
      accessorKey: 'createdAt',
      header: () => <DataTableColumnHeader title="Created" />,
      cell: ({ row }) => format(row.original.createdAt, 'MMM d, yyyy'),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const org = row.original;

        return (
          <div className="flex justify-end">
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
                    onView(row.original.id);
                  }}
                >
                  <Building2 />
                  View Organization
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(org.id, org.name);
                  }}
                  className="text-destructive hover:!text-destructive"
                >
                  <Trash2 className="text-destructive" />
                  Delete Organization
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return columns;
}
