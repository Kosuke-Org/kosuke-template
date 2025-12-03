/**
 * Organizations DataTable Component
 * TanStack Table implementation with server-side pagination and filtering
 */

'use client';

import { useMemo } from 'react';

import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import { Search } from 'lucide-react';

import type { AppRouter } from '@/lib/trpc/router';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getOrganizationColumns } from './organizations-columns';

// Infer OrganizationWithDetails from tRPC router output
type RouterOutput = inferRouterOutputs<AppRouter>;
type OrganizationWithDetails =
  RouterOutput['admin']['organizations']['list']['organizations'][number];

interface OrganizationsDataTableProps {
  organizations: OrganizationWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  // Filter props
  searchQuery: string;
  // Event handlers
  onSearchChange: (query: string) => void;
  // Pagination handlers
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  // Action handlers
  onView: (slug: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function OrganizationsDataTable({
  organizations,
  total,
  page,
  pageSize,
  totalPages,
  searchQuery,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onView,
  onDelete,
}: OrganizationsDataTableProps) {
  const columns = useMemo(() => getOrganizationColumns({ onView, onDelete }), [onView, onDelete]);

  // eslint-disable-next-line
  const table = useReactTable({
    data: organizations,
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
    <>
      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-[400px] lg:w-[500px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-4">
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
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => onView(row.original.slug)}
                  >
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
                    No results. {searchQuery && 'Try adjusting your search.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {organizations.length > 0 && (
          <DataTablePagination
            table={table}
            totalRecords={total}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        )}
      </div>
    </>
  );
}
