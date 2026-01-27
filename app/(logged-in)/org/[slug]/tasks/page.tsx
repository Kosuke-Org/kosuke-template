/**
 * Organization Tasks Page
 * Org-scoped tasks management
 */

'use client';

import { useMemo, useState } from 'react';

import { useViewModeStore } from '@/store/use-view-mode';
import { LayoutGrid, List, Plus } from 'lucide-react';
import { z } from 'zod';

import { TaskDialog } from '@/app/(logged-in)/org/[slug]/tasks/components/task-dialog';
import { TaskItem } from '@/app/(logged-in)/org/[slug]/tasks/components/task-item';

import { createTaskSchema, updateTaskSchema } from '@/lib/trpc/schemas/tasks';
import type { TaskPriority } from '@/lib/types';

import { useOrganization } from '@/hooks/use-organization';
import { useTasks } from '@/hooks/use-tasks';

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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { KanbanBoard } from './components/kanban-board';

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
        <Skeleton className="h-10 max-w-sm flex-1" />
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
  const { organization: activeOrganization, isLoading: isLoadingOrg } = useOrganization();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { viewMode, setViewMode } = useViewModeStore();

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
    isCreating,
    isUpdating,
    isDeleting,
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

  if (isLoadingOrg || isLoading || !activeOrganization) {
    return <TasksPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage tasks for your organization</p>
      </div>

      {/* Tabs & Action Bar */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as TaskFilter)}>
        <div className="flex items-center gap-4">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <div className="relative max-w-sm flex-1">
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
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setCreateDialogOpen(true)} className="whitespace-nowrap">
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'secondary'}
              onClick={() => setViewMode('list')}
              className="whitespace-nowrap"
            >
              <List className="mr-2 h-4 w-4" />
              List
            </Button>
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'secondary'}
              onClick={() => setViewMode('kanban')}
              className="whitespace-nowrap"
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Kanban
            </Button>
          </div>
        </div>
        <TabsContent value={filter} className="mt-6">
          {tasks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <h3 className="mb-1 text-lg font-semibold">No tasks found</h3>
                <p className="text-muted-foreground mb-4 text-sm">
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
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  {...task}
                  onToggleComplete={updateTask}
                  onEdit={handleEditClick}
                  onDelete={handleDeleteClick}
                />
              ))}
            </div>
          ) : (
            <KanbanBoard
              tasks={tasks}
              onToggleComplete={updateTask}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
              onPriorityChange={updateTask}
            />
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
