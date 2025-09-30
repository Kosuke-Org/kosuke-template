/**
 * Custom hook for task operations
 * Uses tRPC for type-safe task management
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/types';

export function useTasks(filters?: { completed?: boolean; priority?: 'low' | 'medium' | 'high' }) {
  const { toast } = useToast();

  // Fetch tasks
  const {
    data: tasks,
    isLoading,
    error,
    refetch,
  } = trpc.tasks.list.useQuery(filters, {
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Fetch stats (no input needed for stats query)
  const { data: stats } = trpc.tasks.stats.useQuery(void 0, {
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Create task mutation
  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Task created successfully',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create task',
        variant: 'destructive',
      });
    },
  });

  // Update task mutation
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Task updated successfully',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });

  // Delete task mutation
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Task deleted successfully',
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete task',
        variant: 'destructive',
      });
    },
  });

  // Toggle completion mutation
  const toggleComplete = trpc.tasks.toggleComplete.useMutation({
    onSuccess: () => {
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update task',
        variant: 'destructive',
      });
    },
  });

  return {
    tasks: tasks ?? [],
    stats,
    isLoading,
    error,
    createTask: (input: CreateTaskInput) => createTask.mutateAsync(input),
    updateTask: (input: UpdateTaskInput) => updateTask.mutateAsync(input),
    deleteTask: (id: number) => deleteTask.mutateAsync({ id }),
    toggleComplete: (id: number) => toggleComplete.mutateAsync({ id }),
    isCreating: createTask.isPending,
    isUpdating: updateTask.isPending,
    isDeleting: deleteTask.isPending,
    isToggling: toggleComplete.isPending,
  };
}
