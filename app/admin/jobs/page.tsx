'use client';

import { useState } from 'react';

import Link from 'next/link';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

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

import { type JobStatus, JobsDataTable } from './components/jobs-data-table';

type DialogState =
  | { type: 'none' }
  | { type: 'retry'; jobId: string }
  | { type: 'remove'; jobId: string }
  | { type: 'clean'; status: 'completed' | 'failed' };

export default function AdminJobsPage() {
  const { toast } = useToast();
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>('failed');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [dialogState, setDialogState] = useState<DialogState>({ type: 'none' });

  const {
    data: queuesData,
    isLoading: isLoadingQueues,
    refetch: refetchQueues,
  } = trpc.admin.jobs.listQueues.useQuery(undefined, {
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 10000, // Refresh every 10 seconds
    placeholderData: (previousData) => previousData,
  });

  if (queuesData && !selectedQueue && queuesData.length > 0) {
    setSelectedQueue(queuesData[0].name);
  }

  const { data: jobsData, refetch: refetchJobs } = trpc.admin.jobs.listJobs.useQuery(
    {
      queueName: selectedQueue,
      status: selectedStatus,
      page,
      pageSize,
    },
    {
      enabled: !!selectedQueue,
      staleTime: 1000 * 30,
    }
  );

  const selectedQueueData = queuesData?.find((q) => q.name === selectedQueue);

  const retryJob = trpc.admin.jobs.retryJob.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Job retried successfully' });
      refetchJobs();
      setDialogState({ type: 'none' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const removeJob = trpc.admin.jobs.removeJob.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Job removed successfully' });
      refetchJobs();
      refetchQueues();
      setDialogState({ type: 'none' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const cleanQueue = trpc.admin.jobs.cleanQueue.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Queue cleaned successfully' });
      refetchJobs();
      refetchQueues();
      setDialogState({ type: 'none' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleConfirmAction = () => {
    if (dialogState.type === 'retry') {
      retryJob.mutate({ queueName: selectedQueue, jobId: dialogState.jobId });
    } else if (dialogState.type === 'remove') {
      removeJob.mutate({ queueName: selectedQueue, jobId: dialogState.jobId });
    } else if (dialogState.type === 'clean') {
      cleanQueue.mutate({
        queueName: selectedQueue,
        grace: 0,
        status: dialogState.status,
      });
    }
  };

  const getDialogContent = () => {
    switch (dialogState.type) {
      case 'retry':
        return {
          title: 'Retry Job',
          description:
            'Are you sure you want to retry this job? It will be moved back to the waiting queue.',
        };
      case 'remove':
        return {
          title: 'Remove Job',
          description:
            'Are you sure you want to remove this job permanently? This action cannot be undone.',
        };
      case 'clean':
        return {
          title: `Clean ${dialogState.status} Jobs`,
          description: `Are you sure you want to clean all ${dialogState.status} jobs from ${selectedQueue}? This will remove old ${dialogState.status} jobs and cannot be undone.`,
        };
      default:
        return { title: '', description: '' };
    }
  };

  const dialogContent = getDialogContent();
  const isPending = retryJob.isPending || removeJob.isPending || cleanQueue.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jobs</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage all jobs in the system</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedQueue}
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
          {selectedQueue && (
            <Button asChild variant="outline">
              <Link href={`/admin/jobs/${selectedQueue}`}>View Settings</Link>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetchJobs();
              refetchQueues();
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {selectedQueueData && (
        <div className="flex items-center gap-4 rounded-lg border p-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">Waiting</span>
            <Badge variant="outline">{selectedQueueData.counts.waiting}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">Active</span>
            <Badge variant="secondary">{selectedQueueData.counts.active}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">Completed</span>
          </div>
          <Badge variant="default">{selectedQueueData.counts.completed}</Badge>
          <div className="flex items-center gap-2">
            <XCircle className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">Failed</span>
          </div>
          <Badge variant="destructive">{selectedQueueData.counts.failed}</Badge>
          <div className="flex items-center gap-2">
            <AlertCircle className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">Delayed</span>
          </div>
          <Badge variant="outline">{selectedQueueData.counts.delayed}</Badge>
        </div>
      )}

      <Tabs
        value={selectedStatus}
        className="gap-4"
        onValueChange={(val) => {
          setSelectedStatus(val as JobStatus);
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="failed">Failed</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="waiting">Waiting</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="delayed">Delayed</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedStatus} className="space-y-4">
          {(selectedStatus === 'completed' || selectedStatus === 'failed') &&
            (jobsData?.total ?? 0) > 0 && (
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogState({ type: 'clean', status: selectedStatus })}
                >
                  <Trash2 className="h-4 w-4" />
                  Clean {selectedStatus} jobs
                </Button>
              </div>
            )}

          <JobsDataTable
            jobs={jobsData?.jobs ?? []}
            total={jobsData?.total ?? 0}
            page={jobsData?.page ?? 1}
            pageSize={pageSize}
            totalPages={jobsData?.totalPages ?? 0}
            selectedStatus={selectedStatus}
            onPageChange={setPage}
            onRetry={(jobId) => setDialogState({ type: 'retry', jobId })}
            onRemove={(jobId) => setDialogState({ type: 'remove', jobId })}
          />
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={dialogState.type !== 'none' || isPending}
        onOpenChange={() => setDialogState({ type: 'none' })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="text-destructive h-5 w-5" />
              <AlertDialogTitle>{dialogContent.title}</AlertDialogTitle>
            </div>
            <AlertDialogDescription>{dialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
