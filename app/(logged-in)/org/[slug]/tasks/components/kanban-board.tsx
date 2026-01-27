/**
 * Kanban Board Component
 * Displays tasks grouped by priority with drag-and-drop functionality
 */

'use client';

import { useMemo, useState } from 'react';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

import { KanbanTaskCard } from '@/app/(logged-in)/org/[slug]/tasks/components/kanban-task-card';

import type { AppRouter } from '@/lib/trpc/router';
import type { TaskPriority } from '@/lib/types';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type RouterOutput = inferRouterOutputs<AppRouter>;
type Task = RouterOutput['tasks']['list'][number];
type RouterInput = inferRouterInputs<AppRouter>;

type UpdateTaskInput = RouterInput['tasks']['update'];
interface KanbanBoardProps {
  tasks: Task[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPriorityChange: (input: UpdateTaskInput) => void;
  onToggleComplete: (input: UpdateTaskInput) => void;
}

const PRIORITY_COLUMNS: { id: TaskPriority; title: string }[] = [
  { id: 'urgent', title: 'Urgent' },
  { id: 'low', title: 'Low Priority' },
  { id: 'medium', title: 'Medium Priority' },
  { id: 'high', title: 'High Priority' },
];

function DroppableColumn({
  column,
  tasks,
  isOver,
  activeId,
  onEdit,
  onDelete,
  onToggleComplete,
}: {
  column: { id: TaskPriority; title: string };
  tasks: Task[];
  isOver: boolean;
  activeId: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (input: UpdateTaskInput) => void;
}) {
  const { setNodeRef } = useDroppable({ id: column.id });

  const completedCount = tasks.filter((task) => task.completed).length;
  const totalCount = tasks.length;

  return (
    <Card
      ref={setNodeRef}
      className={`min-h-[500px] transition-all duration-200 ${
        isOver && activeId ? 'ring-primary bg-primary/5 ring-1 ring-offset-1' : ''
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{column.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {totalCount > 0 ? (
                <>
                  {completedCount} / {totalCount}
                </>
              ) : (
                totalCount
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No {column.title.toLowerCase()} tasks
          </p>
        ) : (
          tasks.map((task) => (
            <KanbanTaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleComplete={onToggleComplete}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function KanbanBoard({
  tasks,
  onEdit,
  onDelete,
  onPriorityChange,
  onToggleComplete,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // Reduced distance for smoother dragging
      },
    })
  );

  // Group tasks by priority
  const tasksByPriority = useMemo(() => {
    const grouped = tasks.reduce(
      (acc, task) => {
        const priority = task.priority;
        if (!acc[priority]) {
          acc[priority] = [];
        }
        acc[priority].push(task);
        return acc;
      },
      {} as Record<TaskPriority, Task[]>
    );

    // Ensure all priorities have arrays
    PRIORITY_COLUMNS.forEach((column) => {
      if (!grouped[column.id]) {
        grouped[column.id] = [];
      }
    });

    return grouped;
  }, [tasks]);

  const activeTask = activeId ? tasks.find((task) => task.id === activeId) : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setOverId(over ? (over.id as string) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const taskId = active.id as string;
    let newPriority: TaskPriority;

    // Check if dropped over a column or a task
    if (PRIORITY_COLUMNS.some((col) => col.id === over.id)) {
      // Dropped directly on column
      newPriority = over.id as TaskPriority;
    } else {
      // Dropped on a task, get the column from the task's priority
      const targetTask = tasks.find((t) => t.id === over.id);
      if (!targetTask) return;
      newPriority = targetTask.priority;
    }

    // Find the task being dragged
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Only update if priority actually changed
    if (task.priority !== newPriority) {
      onPriorityChange({ id: taskId, priority: newPriority });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        {PRIORITY_COLUMNS.map((column) => {
          const columnTasks = tasksByPriority[column.id] || [];
          const draggedTask = activeId ? tasks.find((t) => t.id === activeId) : null;
          const isOverColumn =
            (overId === column.id || columnTasks.some((task) => task.id === overId)) &&
            draggedTask?.priority !== column.id; // Don't highlight if dragging over current column

          return (
            <SortableContext
              key={column.id}
              id={column.id}
              items={columnTasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn
                column={column}
                tasks={columnTasks}
                isOver={isOverColumn}
                activeId={activeId}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleComplete={onToggleComplete}
              />
            </SortableContext>
          );
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <Card className="cursor-grabbing opacity-90 shadow-lg">
            <CardContent className="px-4">
              <div className="flex items-center gap-2">
                <div className="border-muted-foreground/30 h-4 w-4 rounded border" />
                <h4 className="text-sm leading-tight font-medium">{activeTask.title}</h4>
              </div>
              {activeTask.description && (
                <p className="text-muted-foreground line-clamp-2 pt-2 text-xs">
                  {activeTask.description}
                </p>
              )}
              {activeTask.dueDate && (
                <div className="text-muted-foreground mt-2 flex items-center gap-1 text-xs">
                  <span>Due: {new Date(activeTask.dueDate).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
