'use client';

import { use, useState } from 'react';

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Play,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { SchedulerSettings } from '../components/scheduler-settings';

function QueueDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-32" />
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

type DialogState =
  | { type: 'none' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'drain' }
  | { type: 'clean'; status: 'completed' | 'failed' };

interface QueueDetailPageProps {
  params: Promise<{
    queueName: string;
  }>;
}

export default function QueueDetailPage({ params }: QueueDetailPageProps) {
  const resolvedParams = use(params);
  const { toast } = useToast();
  const [dialogState, setDialogState] = useState<DialogState>({ type: 'none' });

  const {
    data: queueData,
    isLoading,
    refetch,
  } = trpc.admin.jobs.getQueue.useQuery(
    { queueName: resolvedParams.queueName },
    {
      staleTime: 1000 * 30,
      refetchInterval: 10000,
    }
  );

  const pauseQueue = trpc.admin.jobs.pauseQueue.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Queue paused successfully' });
      refetch();
      setDialogState({ type: 'none' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resumeQueue = trpc.admin.jobs.resumeQueue.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Queue resumed successfully' });
      refetch();
      setDialogState({ type: 'none' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const drainQueue = trpc.admin.jobs.drainQueue.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Queue drained successfully' });
      refetch();
      setDialogState({ type: 'none' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const cleanQueue = trpc.admin.jobs.cleanQueue.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Queue cleaned successfully' });
      refetch();
      setDialogState({ type: 'none' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleConfirmAction = async () => {
    if (dialogState.type === 'pause') {
      await pauseQueue.mutateAsync({ queueName: resolvedParams.queueName });
    } else if (dialogState.type === 'resume') {
      await resumeQueue.mutateAsync({ queueName: resolvedParams.queueName });
    } else if (dialogState.type === 'drain') {
      await drainQueue.mutateAsync({ queueName: resolvedParams.queueName });
    } else if (dialogState.type === 'clean') {
      await cleanQueue.mutateAsync({
        queueName: resolvedParams.queueName,
        grace: 0,
        status: dialogState.status,
      });
    }
  };

  const getDialogContent = () => {
    switch (dialogState.type) {
      case 'pause':
        return {
          title: 'Pause Queue',
          description:
            'Are you sure you want to pause this queue? No new jobs will be processed until resumed.',
        };
      case 'resume':
        return {
          title: 'Resume Queue',
          description: 'Are you sure you want to resume this queue? Job processing will restart.',
        };
      case 'drain':
        return {
          title: 'Drain Queue',
          description:
            'Are you sure you want to drain this queue? This will remove all waiting jobs. Active jobs will continue processing.',
        };
      case 'clean':
        return {
          title: `Clean ${dialogState.status} Jobs`,
          description: `Are you sure you want to clean all ${dialogState.status} jobs? This will remove old ${dialogState.status} jobs and cannot be undone.`,
        };
      default:
        return { title: '', description: '' };
    }
  };

  const dialogContent = getDialogContent();
  const isPending =
    pauseQueue.isPending || resumeQueue.isPending || drainQueue.isPending || cleanQueue.isPending;

  if (isLoading) {
    return <QueueDetailSkeleton />;
  }

  if (!queueData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <h3 className="mb-1 text-lg font-semibold">Queue not found</h3>
        <p className="text-muted-foreground mb-4 text-sm">
          The queue you&apos;re looking for doesn&apos;t exist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{queueData.name}</h1>
          <p className="text-muted-foreground mt-1 text-sm">Queue configuration and statistics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          {queueData.isPaused ? (
            <Button variant="outline" size="sm" onClick={() => setDialogState({ type: 'resume' })}>
              <Play className="h-4 w-4" />
              Resume
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setDialogState({ type: 'pause' })}>
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Queue Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Queue Statistics</CardTitle>
            <CardDescription>Current job counts and queue status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Waiting</span>
                </div>
                <Badge variant="outline">{queueData.counts.waiting}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Active</span>
                </div>
                <Badge variant="secondary">{queueData.counts.active}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Completed</span>
                </div>
                <Badge variant="default">{queueData.counts.completed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Failed</span>
                </div>
                <Badge variant="destructive">{queueData.counts.failed}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="text-muted-foreground h-4 w-4" />
                  <span className="text-sm">Delayed</span>
                </div>
                <Badge variant="outline">{queueData.counts.delayed}</Badge>
              </div>
            </div>

            <div className="border-border border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Queue Status</span>
                {queueData.isPaused ? (
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
            </div>

            <div className="border-border space-y-2 border-t pt-4">
              <h4 className="text-sm font-medium">Queue Actions</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => setDialogState({ type: 'drain' })}
                  disabled={queueData.counts.waiting === 0}
                >
                  <Trash2 className="h-4 w-4" />
                  Drain queue
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => setDialogState({ type: 'clean', status: 'completed' })}
                  disabled={queueData.counts.completed === 0}
                >
                  <Trash2 className="h-4 w-4" />
                  Clean completed jobs
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-start"
                  onClick={() => setDialogState({ type: 'clean', status: 'failed' })}
                  disabled={queueData.counts.failed === 0}
                >
                  <Trash2 className="h-4 w-4" />
                  Clean failed jobs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scheduler Settings */}
        <SchedulerSettings
          queueName={resolvedParams.queueName}
          schedulers={queueData.schedulers}
          onUpdate={refetch}
        />
      </div>

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
