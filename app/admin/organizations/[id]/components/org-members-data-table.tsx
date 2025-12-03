/**
 * Organization Members DataTable Component
 * Shows users that belong to an organization
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

import { getOrgMembersColumns } from './org-members-columns';

// Infer MembershipWithDetails from tRPC router output
type RouterOutput = inferRouterOutputs<AppRouter>;
type MembershipWithDetails = RouterOutput['admin']['memberships']['list']['memberships'][number];

interface OrgMembersDataTableProps {
  memberships: MembershipWithDetails[];
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
  onView: (userId: string) => void;
  onRemove: (id: string, userName: string, orgName: string) => void;
}

export function OrgMembersDataTable({
  memberships,
  total,
  page,
  pageSize,
  totalPages,
  searchQuery,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onView,
  onRemove,
}: OrgMembersDataTableProps) {
  const columns = useMemo(() => getOrgMembersColumns({ onRemove }), [onRemove]);

  // eslint-disable-next-line
  const table = useReactTable({
    data: memberships,
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
      <h3 className="text-lg font-semibold">Members</h3>

      <div className="flex items-center gap-3">
        <div className="relative w-full sm:w-[400px] lg:w-[500px]">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search members by name or email..."
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
                    onClick={() => onView(row.original.user.id)}
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
        {memberships.length > 0 && (
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
