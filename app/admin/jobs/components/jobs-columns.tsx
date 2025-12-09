'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { inferRouterOutputs } from '@trpc/server';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';

import type { AppRouter } from '@/lib/trpc/router';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type RouterOutput = inferRouterOutputs<AppRouter>;
type JobWithDetails = RouterOutput['admin']['jobs']['listJobs']['jobs'][number];

export type JobStatus = 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';

interface ActionsCallbacks {
  onRetry: (jobId: string) => void;
  onRemove: (jobId: string) => void;
}

interface ColumnConfig {
  selectedStatus: JobStatus;
}

const statusConfig: Record<
  JobStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    variant: 'default' | 'destructive' | 'secondary' | 'outline';
  }
> = {
  completed: { icon: CheckCircle2, variant: 'default' },
  failed: { icon: XCircle, variant: 'destructive' },
  active: { icon: Activity, variant: 'secondary' },
  waiting: { icon: Clock, variant: 'outline' },
  delayed: { icon: AlertCircle, variant: 'outline' },
};

export function getJobsColumns(
  { onRetry, onRemove }: ActionsCallbacks,
  { selectedStatus }: ColumnConfig
): ColumnDef<JobWithDetails>[] {
  return [
    {
      accessorKey: 'id',
      header: 'Job ID',
      cell: ({ row }) => <div className="font-mono text-sm">{row.original.id}</div>,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      id: 'status',
      header: 'Status',
      cell: () => {
        const StatusIcon = statusConfig[selectedStatus].icon;
        return (
          <Badge variant={statusConfig[selectedStatus].variant}>
            <StatusIcon className="mr-1 h-3 w-3" />
            {selectedStatus}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'timestamp',
      header: 'Timestamp',
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm">
          {row.original.timestamp ? new Date(row.original.timestamp).toLocaleString() : '-'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        return (
          <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
            {selectedStatus === 'failed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(row.original.id);
                }}
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(row.original.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
  ];
}
