'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Download, Loader2, MoreHorizontal, Trash2 } from 'lucide-react';

import type { DocumentWithUser } from '@/lib/types';
import { formatBytes } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ColumnActionsProps {
  onDelete: (id: string, displayName: string) => void;
  onDownload: (storageUrl: string, documentId: string) => void;
}

export function getDocumentsColumns(actions: ColumnActionsProps): ColumnDef<DocumentWithUser>[] {
  const { onDelete, onDownload } = actions;
  return [
    {
      id: 'name',
      accessorKey: 'displayName',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span>,
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.status === 'in_progress' ? 'secondary' : 'default'}
          className="capitalize"
        >
          {row.original.status === 'in_progress' && <Loader2 className="h-3 w-3 animate-spin" />}
          {row.original.status === 'in_progress' ? 'Indexing' : row.original.status}
        </Badge>
      ),
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
                    onDownload(doc.storageUrl, doc.id);
                  }}
                >
                  <Download className="h-4 w-4" />
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc.id, doc.displayName);
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
