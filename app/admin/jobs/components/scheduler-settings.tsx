'use client';

import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import type { inferRouterOutputs } from '@trpc/server';
import { format } from 'date-fns';
import { Calendar, Edit2, Loader2, Play } from 'lucide-react';
import { z } from 'zod';

import { trpc } from '@/lib/trpc/client';
import type { AppRouter } from '@/lib/trpc/router';
import { adminUpdateSchedulerSchema } from '@/lib/trpc/schemas/admin';

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

type RouterOutput = inferRouterOutputs<AppRouter>;
type Scheduler = RouterOutput['admin']['jobs']['getQueue']['schedulers'][number];

interface SchedulerSettingsProps {
  queueName: string;
  schedulers: Scheduler[];
  onUpdate: () => void;
}

// Form schema - omit queueName and schedulerId as they're set externally
const updateSchedulerFormSchema = adminUpdateSchedulerSchema.omit({
  queueName: true,
  schedulerId: true,
});

type UpdateSchedulerFormValues = z.infer<typeof updateSchedulerFormSchema>;

export function SchedulerSettings({ queueName, schedulers, onUpdate }: SchedulerSettingsProps) {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);
  const [selectedScheduler, setSelectedScheduler] = useState<Scheduler | null>(null);

  const form = useForm<UpdateSchedulerFormValues>({
    resolver: zodResolver(updateSchedulerFormSchema),
    defaultValues: {
      pattern: '',
    },
  });

  const updateScheduler = trpc.admin.jobs.updateScheduler.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Scheduler updated successfully' });
      setEditDialogOpen(false);
      form.reset();
      onUpdate();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const triggerJob = trpc.admin.jobs.triggerScheduledJob.useMutation({
    onSuccess: () => {
      toast({ title: 'Success', description: 'Job triggered successfully' });
      setTriggerDialogOpen(false);
      onUpdate();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEdit = (scheduler: Scheduler) => {
    setSelectedScheduler(scheduler);
    form.reset({ pattern: scheduler.pattern ?? '' });
    setEditDialogOpen(true);
  };

  const handleTrigger = (scheduler: Scheduler) => {
    setSelectedScheduler(scheduler);
    setTriggerDialogOpen(true);
  };

  const onSubmit = async (data: UpdateSchedulerFormValues) => {
    if (!selectedScheduler) return;

    await updateScheduler.mutateAsync({
      queueName,
      schedulerId: selectedScheduler.id,
      pattern: data.pattern,
    });
  };

  const handleTriggerJob = async () => {
    if (!selectedScheduler || !selectedScheduler.name) {
      toast({
        title: 'Error',
        description: 'Cannot trigger job: No job name configured',
        variant: 'destructive',
      });
      return;
    }

    await triggerJob.mutateAsync({
      queueName,
      jobName: selectedScheduler.name,
      data: (selectedScheduler.template?.data as Record<string, unknown>) ?? {},
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Scheduled Jobs</CardTitle>
          <CardDescription>Configure recurring job schedules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedulers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <h3 className="mb-1 text-lg font-semibold">No schedulers configured</h3>
              <p className="text-muted-foreground text-sm">
                This queue has no scheduled jobs configured.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedulers.map((scheduler) => (
                <div key={scheduler.id} className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">{scheduler.name}</div>
                      <div className="text-muted-foreground flex items-center gap-2 text-xs">
                        <Calendar className="h-3 w-3" />
                        {scheduler.pattern}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(scheduler)}
                        disabled={updateScheduler.isPending}
                      >
                        <Edit2 className="h-3 w-3" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTrigger(scheduler)}
                        disabled={triggerJob.isPending}
                      >
                        <Play className="h-3 w-3" />
                        Trigger
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Next run:</span>
                    <Badge variant="outline" className="text-xs">
                      {scheduler.nextRun
                        ? format(new Date(scheduler.nextRun), 'MM/dd/yyyy HH:mm:ss')
                        : 'Not scheduled'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Scheduler Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) form.reset();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
            <DialogDescription>
              Update the cron pattern for this scheduled job. Changes will take effect on the next
              worker restart.
            </DialogDescription>
          </DialogHeader>
          <form id="edit-scheduler-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Controller
                name="pattern"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="cron-pattern">Cron Pattern</FieldLabel>
                    <Input
                      {...field}
                      id="cron-pattern"
                      aria-invalid={fieldState.invalid}
                      placeholder="0 0 * * *"
                      disabled={updateScheduler.isPending}
                    />
                    <FieldDescription>
                      Current: {selectedScheduler?.pattern || 'Not set'}
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>
          </form>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updateScheduler.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" form="edit-scheduler-form" disabled={updateScheduler.isPending}>
              {updateScheduler.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trigger Job Dialog */}
      <AlertDialog open={triggerDialogOpen} onOpenChange={setTriggerDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Trigger Job Manually</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to trigger <strong>{selectedScheduler?.name}</strong> manually?
              This will add it to the queue immediately with high priority.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={triggerJob.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleTriggerJob} disabled={triggerJob.isPending}>
              {triggerJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Trigger Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
