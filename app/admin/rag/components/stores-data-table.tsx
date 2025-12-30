/**
 * Stores DataTable Component
 * TanStack Table implementation for File Search Stores
 */

'use client';

import { useMemo } from 'react';

import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';

import type { Stores } from '@/lib/services/rag-service';

import { TableSkeleton } from '@/components/data-table/data-table-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getStoresColumns } from './stores-columns';

interface StoresDataTableProps {
  stores: Stores[];
  isLoading?: boolean;
  onDelete: (name: string, displayName: string) => void;
}

export function StoresDataTable({ stores, isLoading, onDelete }: StoresDataTableProps) {
  const columns = useMemo(() => getStoresColumns({ onDelete }), [onDelete]);

  // eslint-disable-next-line
  const table = useReactTable({
    data: stores,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (stores.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="mb-1 text-lg font-semibold">No File Search Stores found</h3>
          <p className="text-muted-foreground text-sm">
            File Search Stores are created automatically when documents are uploaded
          </p>
        </div>
      </div>
    );
  }

  return (
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
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
