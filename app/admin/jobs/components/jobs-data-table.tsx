'use client';

import * as React from 'react';

import { flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';

import type { AppRouter } from '@/lib/trpc/router';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { type JobStatus, getJobsColumns } from './jobs-columns';

export type { JobStatus } from './jobs-columns';

type RouterOutput = inferRouterOutputs<AppRouter>;
type JobWithDetails = RouterOutput['admin']['jobs']['listJobs']['jobs'][number];

interface JobsDataTableProps {
  jobs: JobWithDetails[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  selectedStatus: JobStatus;
  onPageChange: (page: number) => void;
  onRetry: (jobId: string) => void;
  onRemove: (jobId: string) => void;
}

export const JobsDataTable = ({
  jobs,
  total,
  page,
  totalPages,
  selectedStatus,
  onPageChange,
  onRetry,
  onRemove,
}: JobsDataTableProps) => {
  const columns = React.useMemo(
    () =>
      getJobsColumns(
        {
          onRetry,
          onRemove,
        },
        {
          selectedStatus,
        }
      ),
    [selectedStatus, onRetry, onRemove]
  );

  // eslint-disable-next-line
  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize: 20,
      },
    },
  });

  return (
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
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}

            {jobs.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <h3 className="mb-1 text-lg font-semibold">No {selectedStatus} jobs</h3>
                    <p className="text-muted-foreground text-sm">No jobs found in this status</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-muted-foreground text-sm">
            Page {page} of {totalPages} ({total} total jobs)
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
