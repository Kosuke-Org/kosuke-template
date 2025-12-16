'use client';

import { useMemo } from 'react';

import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Search } from 'lucide-react';

import type { DocumentWithUser } from '@/lib/types';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { TableSkeleton } from '@/components/data-table/data-table-skeleton';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getDocumentsColumns } from './documents-columns';

interface DocumentsDataTableProps {
  documents: DocumentWithUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchQuery: string;
  isLoading: boolean;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onDelete: (id: string, displayName: string) => void;
}

export function DocumentsDataTable({
  documents,
  total,
  page,
  pageSize,
  totalPages,
  searchQuery,
  isLoading,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onDelete,
}: DocumentsDataTableProps) {
  const columns = useMemo(() => getDocumentsColumns({ onDelete }), [onDelete]);

  // eslint-disable-next-line
  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-[400px] lg:w-[500px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
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
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <p className="text-muted-foreground text-sm">
                          {searchQuery ? 'Try adjusting your search' : 'No documents found'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {documents.length > 0 && (
            <DataTablePagination
              table={table}
              totalRecords={total}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          )}
        </div>
      )}
    </div>
  );
}
