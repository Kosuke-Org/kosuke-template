'use client';

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
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

type RouterOutput = inferRouterOutputs<AppRouter>;
type LlmLogRow = RouterOutput['admin']['llmLogs']['list']['logs'][number];

interface LlmLogsDataTableProps {
  columns: ColumnDef<LlmLogRow>[];
  logs: LlmLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onRowClick: (id: string) => void;
}

export function LlmLogsDataTable({
  columns,
  logs,
  total,
  page,
  pageSize,
  totalPages,
  searchQuery,
  onSearchChange,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}: LlmLogsDataTableProps) {
  // eslint-disable-next-line
  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
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
      {/* Search and Filters */}
      <div className="relative w-full sm:w-[400px] lg:w-[500px]">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search by endpoint or model..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
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
                  className="hover:bg-muted/50 cursor-pointer"
                  onClick={() => onRowClick(row.original.id)}
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
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <h3 className="mb-1 text-lg font-semibold">No logs found</h3>
                    <p className="text-muted-foreground text-sm">
                      {!!searchQuery
                        ? 'Try adjusting your filters'
                        : 'No LLM logs have been recorded yet'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {logs.length > 0 && (
        <DataTablePagination
          table={table}
          totalRecords={total}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
