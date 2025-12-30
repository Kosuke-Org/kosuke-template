/**
 * Stores Table Column Definitions
 * Defines columns for the stores data table
 */

'use client';

import Link from 'next/link';

import { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, MoreHorizontal, Trash2, XCircle } from 'lucide-react';

import type { Stores } from '@/lib/services/rag-service';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnActionsProps {
  onDelete: (name: string, displayName: string) => void;
}

export function getStoresColumns({ onDelete }: ColumnActionsProps): ColumnDef<Stores>[] {
  return [
    {
      accessorKey: 'displayName',
      header: () => <DataTableColumnHeader title="Store Name" />,
      cell: ({ row }) => <div className="font-medium">{row.original.displayName}</div>,
    },
    {
      accessorKey: 'organization',
      header: () => <DataTableColumnHeader title="Organization" />,
      cell: ({ row }) => {
        const org = row.original.organization;
        if (!org) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <Button asChild variant="link" className="h-auto p-0 text-sm">
            <Link href={`/admin/organizations/${org.id}`}>{org.name}</Link>
          </Button>
        );
      },
    },
    {
      accessorKey: 'documentCount',
      header: () => <DataTableColumnHeader title="Documents" />,
      cell: ({ row }) => (
        <div className="text-sm">
          <span className="font-medium">{row.original.documentCount}</span>
        </div>
      ),
    },
    {
      accessorKey: 'syncStatus',
      header: () => <DataTableColumnHeader title="Status" />,
      cell: ({ row }) => (
        <Badge variant={row.original.syncStatus === 'synced' ? 'default' : 'destructive'}>
          {row.original.syncStatus === 'synced' ? (
            <>
              <CheckCircle2 className="h-4 w-4" /> Synced
            </>
          ) : (
            <>
              <XCircle className="h-4 w-4" /> Mismatch
            </>
          )}
        </Badge>
      ),
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const { name, displayName } = row.original;

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
                    onDelete(name, displayName);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="text-destructive h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
