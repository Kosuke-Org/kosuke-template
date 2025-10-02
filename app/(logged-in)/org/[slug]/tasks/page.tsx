/**
 * Organization Tasks Page
 * Org-scoped tasks management
 */

'use client';

import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useTasks } from '@/hooks/use-tasks';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { TaskItem } from '@/app/(logged-in)/org/[slug]/tasks/components/task-item';
import { TaskDialog } from '@/app/(logged-in)/org/[slug]/tasks/components/task-dialog';
import type { TaskPriority } from '@/lib/types';
import { createTaskSchema, updateTaskSchema } from '@/lib/trpc/schemas/tasks';

type TaskFilter = 'all' | 'active' | 'completed';

// Skeleton components
function TaskSkeleton() {
  return (
    <Card className="py-3">
      <CardHeader className="flex flex-row items-center gap-4 px-6 py-0">
        <Skeleton className="h-5 w-5 rounded" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-16" />
      </CardHeader>
    </Card>
  );
}

function TasksPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="flex items-center gap-4 overflow-x-auto">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-10 flex-1 max-w-sm" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <TaskSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function OrgTasksPage() {
  const { activeOrganization, isLoading: isLoadingOrg } = useActiveOrganization();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Fetch org-scoped tasks
  const {
    tasks,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    toggleComplete,
    isCreating,
    isUpdating,
    isDeleting,
    isToggling,
  } = useTasks({
    completed: filter === 'all' ? undefined : filter === 'completed',
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
    searchQuery: searchQuery.trim() || undefined,
    organizationId: activeOrganization?.id, // Filter by org
  });

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId),
    [tasks, selectedTaskId]
  );

  const handleCreateTask = async (values: z.infer<typeof createTaskSchema>) => {
    await createTask({
      ...values,
      organizationId: activeOrganization?.id, // Associate with org
    });
  };

  const handleUpdateTask = async (values: z.infer<typeof updateTaskSchema>) => {
    await updateTask(values);
  };

  const handleDeleteTask = async () => {
    if (!selectedTaskId) return;
    await deleteTask(selectedTaskId);
    setDeleteDialogOpen(false);
    setSelectedTaskId(null);
  };

  const handleEditClick = (id: string) => {
    setSelectedTaskId(id);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setSelectedTaskId(id);
    setDeleteDialogOpen(true);
  };

  if (isLoadingOrg || isLoading) {
    return <TasksPageSkeleton />;
  }

  if (!activeOrganization) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">No organization selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">Manage tasks for {activeOrganization.name}</p>
        </div>
      </div>

      {/* Tabs & Action Bar */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as TaskFilter)}>
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <div className="relative flex-1 max-w-sm">
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select
            value={priorityFilter}
            onValueChange={(value) => setPriorityFilter(value as TaskPriority | 'all')}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateDialogOpen(true)} className="whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
        <TabsContent value={filter} className="mt-6 space-y-3">
          {tasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="font-semibold text-lg mb-1">No tasks found</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || priorityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Create your first task to get started'}
                </p>
                {!searchQuery && priorityFilter === 'all' && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Task
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            tasks.map((task) => (
              <TaskItem
                key={task.id}
                {...task}
                onToggleComplete={toggleComplete}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
                isToggling={isToggling}
              />
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Create Task Dialog */}
      <TaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTask}
        mode="create"
        isSubmitting={isCreating}
      />

      {/* Edit Task Dialog */}
      <TaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={async (values) => {
          if (!selectedTaskId) return;
          await handleUpdateTask({ id: selectedTaskId, ...values });
        }}
        initialValues={
          selectedTask
            ? {
                title: selectedTask.title,
                description: selectedTask.description ?? undefined,
                priority: selectedTask.priority,
                dueDate: selectedTask.dueDate ?? undefined,
              }
            : undefined
        }
        mode="edit"
        isSubmitting={isUpdating}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this task. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
