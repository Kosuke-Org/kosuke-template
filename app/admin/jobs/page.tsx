'use client';

import { useState } from 'react';

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Pause,
  Play,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';

import { trpc } from '@/lib/trpc/client';

import { useToast } from '@/hooks/use-toast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function QueuesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  );
}

function JobsTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

type JobStatus = 'completed' | 'failed' | 'active' | 'waiting' | 'delayed';

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

export default function AdminJobsPage() {
  const { toast } = useToast();
  const [selectedQueue, setSelectedQueue] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<JobStatus>('failed');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch queues
  const {
    data: queuesData,
    isLoading: isLoadingQueues,
    refetch: refetchQueues,
  } = trpc.admin.jobs.listQueues.useQuery(undefined, {
    staleTime: 1000 * 30, // 30 seconds
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Set default queue when data loads
  if (queuesData && !selectedQueue && queuesData.length > 0) {
    setSelectedQueue(queuesData[0].name);
  }

  // Fetch jobs
  const {
    data: jobsData,
    isLoading: isLoadingJobs,
    refetch: refetchJobs,
  } = trpc.admin.jobs.listJobs.useQuery(
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

  // Mutations
  const retryJob = trpc.admin.jobs.retryJob.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Job retried successfully' });
      refetchJobs();
      refetchQueues();
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
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const pauseQueue = trpc.admin.jobs.pauseQueue.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Queue paused successfully' });
      refetchQueues();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resumeQueue = trpc.admin.jobs.resumeQueue.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Queue resumed successfully' });
      refetchQueues();
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
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleRetry = async (jobId: string) => {
    if (confirm('Retry this job?')) {
      await retryJob.mutateAsync({ queueName: selectedQueue, jobId });
    }
  };

  const handleRemove = async (jobId: string) => {
    if (confirm('Remove this job permanently?')) {
      await removeJob.mutateAsync({ queueName: selectedQueue, jobId });
    }
  };

  const handleTogglePause = async (queueName: string, isPaused: boolean) => {
    if (isPaused) {
      await resumeQueue.mutateAsync({ queueName });
    } else {
      if (confirm('Pause this queue? No new jobs will be processed.')) {
        await pauseQueue.mutateAsync({ queueName });
      }
    }
  };

  const handleClean = async (status: 'completed' | 'failed') => {
    if (
      confirm(
        `Clean all ${status} jobs from ${selectedQueue}? This will remove old ${status} jobs.`
      )
    ) {
      await cleanQueue.mutateAsync({
        queueName: selectedQueue,
        grace: 0,
        status,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Jobs & Queues</h1>
        <p className="text-muted-foreground">Monitor and manage BullMQ job queues</p>
      </div>

      {/* Queues Overview */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Queues Overview</h2>
        {isLoadingQueues ? (
          <QueuesSkeleton />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {queuesData?.map((queue) => (
              <Card key={queue.name}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{queue.name}</CardTitle>
                    {queue.isPaused ? (
                      <Badge variant="secondary">
                        <Pause className="mr-1 h-3 w-3" />
                        Paused
                      </Badge>
                    ) : (
                      <Badge variant="default">
                        <Play className="mr-1 h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Waiting:</span>
                      <span className="font-medium">{queue.counts.waiting}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Active:</span>
                      <span className="font-medium">{queue.counts.active}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Completed:</span>
                      <span className="font-medium">{queue.counts.completed}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Failed:</span>
                      <span className="text-destructive font-medium">{queue.counts.failed}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleTogglePause(queue.name, queue.isPaused)}
                    >
                      {queue.isPaused ? (
                        <>
                          <Play className="h-3 w-3" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="h-3 w-3" />
                          Pause
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedQueue(queue.name);
                        setPage(1);
                      }}
                    >
                      View Jobs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Jobs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Jobs</CardTitle>
              <CardDescription>View and manage jobs in selected queue</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={selectedQueue}
                onValueChange={(val) => {
                  setSelectedQueue(val);
                  setPage(1);
                }}
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
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={selectedStatus}
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
              {selectedStatus === 'completed' || selectedStatus === 'failed' ? (
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleClean(selectedStatus)}>
                    <Trash2 className="h-4 w-4" />
                    Clean {selectedStatus} jobs
                  </Button>
                </div>
              ) : null}

              {isLoadingJobs ? (
                <JobsTableSkeleton />
              ) : !jobsData || jobsData.jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <h3 className="mb-1 text-lg font-semibold">No {selectedStatus} jobs</h3>
                  <p className="text-muted-foreground text-sm">No jobs found in this status</p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobsData.jobs.map((job) => {
                          const StatusIcon = statusConfig[selectedStatus].icon;
                          return (
                            <TableRow key={job.id}>
                              <TableCell className="font-mono text-sm">{job.id}</TableCell>
                              <TableCell className="font-medium">{job.name}</TableCell>
                              <TableCell>
                                <Badge variant={statusConfig[selectedStatus].variant}>
                                  <StatusIcon className="mr-1 h-3 w-3" />
                                  {selectedStatus}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {job.timestamp ? new Date(job.timestamp).toLocaleString() : '-'}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {selectedStatus === 'failed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleRetry(job.id)}
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      Retry
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemove(job.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {jobsData.totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-muted-foreground text-sm">
                        Page {jobsData.page} of {jobsData.totalPages} ({jobsData.total} total jobs)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === 1}
                          onClick={() => setPage(page - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page === jobsData.totalPages}
                          onClick={() => setPage(page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
