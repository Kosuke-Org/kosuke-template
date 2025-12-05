'use client';

import * as React from 'react';

import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import { Plus, Search } from 'lucide-react';

import type { AppRouter } from '@/lib/trpc/router';

import { DataTablePagination } from '@/components/data-table/data-table-pagination';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getUsersColumns } from './users-columns';

type RouterOutput = inferRouterOutputs<AppRouter>;
type UserWithDetails = RouterOutput['admin']['users']['list']['users'][number];

interface UsersDataTableProps {
  users: UserWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (id: string) => void;
  onDelete: (id: string, email: string) => void;
  onCreate: () => void;
}

export function UsersDataTable({
  users,
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
  onCreate,
}: UsersDataTableProps) {
  const columns = React.useMemo(() => getUsersColumns({ onView, onDelete }), [onView, onDelete]);

  // eslint-disable-next-line
  const table = useReactTable({
    data: users,
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
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="ml-auto">
          <Button onClick={onCreate}>
            <Plus />
            Create User
          </Button>
        </div>
      </div>
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
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => onView(row.original.id)}
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
        <DataTablePagination
          table={table}
          totalRecords={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </>
  );
}
