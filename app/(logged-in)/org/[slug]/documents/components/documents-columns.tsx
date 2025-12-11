'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { MoreHorizontal, Trash2 } from 'lucide-react';

import type { DocumentWithUser } from '@/lib/types';
import { formatBytes } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnActionsProps {
  onDelete: (id: string, displayName: string) => void;
}

export function getDocumentsColumns(actions: ColumnActionsProps): ColumnDef<DocumentWithUser>[] {
  const { onDelete } = actions;
  return [
    {
      id: 'name',
      accessorKey: 'displayName',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span>,
    },
    {
      id: 'size',
      accessorKey: 'sizeBytes',
      header: 'Size',
      cell: ({ row }) => formatBytes(parseInt(row.original.sizeBytes)),
    },
    {
      id: 'uploadedBy',
      header: 'Uploaded by',
      cell: ({ row }) => <span className="text-sm">{row.original.userDisplayName}</span>,
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: 'Uploaded at',
      cell: ({ row }) => (
        <span className="text-sm">{format(row.original.createdAt, 'MMM d, yyyy')}</span>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const doc = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc.id, doc.displayName);
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="text-destructive size-4" />
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
