'use client';

import { useState } from 'react';

import { format } from 'date-fns';
import { Clock, Loader2, Play, RefreshCw } from 'lucide-react';

import { trpc } from '@/lib/trpc/client';
import type { JobStatus } from '@/lib/trpc/schemas/admin';

import { useTablePagination } from '@/hooks/use-table-pagination';
import { useToast } from '@/hooks/use-toast';

import { TableSkeleton } from '@/components/data-table/data-table-skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { JobsDataTable } from './components/jobs-data-table';

function JobsPageSkeleton() {
  return <TableSkeleton />;
}

export default function AdminJobsPage() {
  const { toast } = useToast();
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>('failed');
  const initialPageSize = 10;
  const { page, setPage, pageSize, setPageSize } = useTablePagination({
    initialPageSize,
  });
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);

  const {
    data: queuesData,
    isLoading: isLoadingQueues,
    refetch: refetchQueues,
  } = trpc.admin.jobs.listQueues.useQuery(undefined, {
    staleTime: 1000 * 30, // 30 seconds
    placeholderData: (previousData) => previousData,
  });

  const activeQueue = selectedQueue || queuesData?.[0]?.name || '';

  const {
    data: queueDetails,
    refetch: refetchQueueDetails,
    isRefetching: isRefetchingDetails,
    isLoading: isLoadingDetails,
  } = trpc.admin.jobs.getQueue.useQuery(
    { queueName: activeQueue },
    {
      enabled: !!activeQueue,
    }
  );

  const {
    data: jobsData,
    refetch: refetchJobs,
    isLoading: isLoadingJobs,
  } = trpc.admin.jobs.listJobs.useQuery(
    {
      queueName: activeQueue,
      status: selectedStatus,
      page,
      pageSize,
    },
    {
      enabled: !!activeQueue,
      staleTime: 1000 * 30,
    }
  );

  const triggerJob = trpc.admin.jobs.triggerScheduledJob.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Job triggered successfully' });
      setTriggerDialogOpen(false);
      refetchQueues();
      refetchJobs();
      refetchQueueDetails();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleTriggerClick = () => {
    setTriggerDialogOpen(true);
  };

  const handleTriggerConfirm = () => {
    // Since there's one scheduler per queue, get the first (and only) scheduler
    const scheduler = queueDetails?.schedulers[0];
    if (!scheduler || !activeQueue) {
      toast({
        title: 'Error',
        description: 'Cannot trigger job: No scheduler configured',
        variant: 'destructive',
      });
      return;
    }

    triggerJob.mutate({
      queueName: activeQueue,
      jobName: scheduler.name,
      data: (scheduler.template?.data as Record<string, unknown>) ?? {},
    });
  };

  if (isLoadingQueues || isLoadingDetails || isLoadingJobs) {
    return <JobsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-muted-foreground text-sm">Monitor and manage background jobs</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={activeQueue}
            onValueChange={(val) => {
              setSelectedQueue(val);
              setPage(1);
            }}
            disabled={isLoadingQueues}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select queue" />
            </SelectTrigger>
            <SelectContent>
              {queuesData?.map((queue) => (
                <SelectItem key={queue.name} value={queue.name}>
                  {queue.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchJobs();
              refetchQueues();
              refetchQueueDetails();
            }}
            disabled={isRefetchingDetails}
          >
            {isRefetchingDetails ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleTriggerClick}
            disabled={triggerJob.isPending || !queueDetails?.schedulers[0]}
          >
            {triggerJob.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Trigger Job
          </Button>
        </div>
      </div>

      <Tabs
        value={selectedStatus}
        className="gap-4"
        onValueChange={(val) => {
          setSelectedStatus(val as JobStatus);
          setPage(1);
        }}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="failed" className="gap-2">
              Failed
              {queueDetails && (
                <Badge className="h-5 min-w-5 px-1 tabular-nums">
                  {queueDetails.counts.failed}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="gap-2">
              Active
              {queueDetails && (
                <Badge className="h-5 min-w-5 px-1 tabular-nums">
                  {queueDetails.counts.active}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="waiting" className="gap-2">
              Waiting
              {queueDetails && (
                <Badge className="h-5 min-w-5 px-1 tabular-nums">
                  {queueDetails.counts.waiting}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-2">
              Completed
              {queueDetails && (
                <Badge className="h-5 min-w-5 px-1 tabular-nums">
                  {queueDetails.counts.completed}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="delayed" className="gap-2">
              Delayed
              {queueDetails && (
                <Badge className="h-5 min-w-5 px-1 tabular-nums">
                  {queueDetails.counts.delayed}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {queueDetails?.schedulers[0] && (
            <div className="flex gap-1 text-sm">
              <span className="flex items-center gap-1.5">
                <Clock className="size-4" />
                Next run:{' '}
                {queueDetails.schedulers[0].nextRun
                  ? format(new Date(queueDetails.schedulers[0].nextRun), 'MMM dd, HH:mm')
                  : 'Not scheduled'}
              </span>
              <span className="text-muted-foreground">
                (cron schedule: {queueDetails.schedulers[0].pattern})
              </span>
            </div>
          )}
        </div>

        <TabsContent value={selectedStatus} key={selectedStatus} className="space-y-4">
          <JobsDataTable
            jobs={jobsData?.jobs ?? []}
            total={jobsData?.total ?? 0}
            page={jobsData?.page ?? 1}
            pageSize={pageSize}
            totalPages={jobsData?.totalPages ?? 0}
            selectedStatus={selectedStatus}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={triggerDialogOpen || triggerJob.isPending}
        onOpenChange={setTriggerDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger Job Manually</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to trigger it manually? This will add it to the queue
              immediately with high priority.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={triggerJob.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTriggerConfirm} disabled={triggerJob.isPending}>
              {triggerJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Trigger
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
