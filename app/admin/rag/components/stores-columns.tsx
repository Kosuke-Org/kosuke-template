/**
 * Stores Table Column Definitions
 * Defines columns for the stores data table
 */

'use client';

import Link from 'next/link';

import { ColumnDef } from '@tanstack/react-table';
import { AlertTriangle, Check, FileX2, MoreHorizontal, Trash2 } from 'lucide-react';

import type { FileSearchStore } from '@/lib/types';

import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnActionsProps {
  onDeleteStore: (name: string, displayName: string) => void;
  onDeleteAllDocuments: (name: string, displayName: string) => void;
  onDeleteDanglingDocuments: (name: string, displayName: string) => void;
}

export function getStoresColumns({
  onDeleteStore,
  onDeleteAllDocuments,
  onDeleteDanglingDocuments,
}: ColumnActionsProps): ColumnDef<FileSearchStore>[] {
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
      header: () => <DataTableColumnHeader title="Total documents" />,
      cell: ({ row }) => {
        return (
          <div className="text-sm">
            <div className="font-medium">{row.original.documentCount}</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'syncStatus',
      header: () => <DataTableColumnHeader title="Status" />,
      cell: ({ row }) => {
        const { documentCount, localCount, syncStatus } = row.original;
        const danglingCount = documentCount - localCount;
        const hasDangling = syncStatus === 'mismatch' && danglingCount > 0;
        return (
          <>
            {hasDangling ? (
              <div className="text-muted-foreground flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                {danglingCount} dangling documents
              </div>
            ) : (
              <Badge variant="default">
                {syncStatus === 'synced' && <Check className="h-4 w-4" />} Synced
              </Badge>
            )}
          </>
        );
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      cell: ({ row }) => {
        const { name, displayName, documentCount, localCount, syncStatus } = row.original;
        const danglingCount = documentCount - localCount;
        const hasDanglingDocs = syncStatus === 'mismatch' && danglingCount > 0;
        const hasDocuments = documentCount > 0;

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
                {hasDocuments && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteAllDocuments(name, displayName);
                      }}
                      className="text-amber-600 focus:text-amber-600"
                    >
                      <FileX2 className="h-4 w-4 text-amber-600" />
                      Delete All Documents
                    </DropdownMenuItem>
                    {hasDanglingDocs && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDanglingDocuments(name, displayName);
                        }}
                        className="text-amber-600 focus:text-amber-600"
                      >
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Delete Dangling Documents ({danglingCount})
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteStore(name, displayName);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="text-destructive h-4 w-4" />
                  Delete Store
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
