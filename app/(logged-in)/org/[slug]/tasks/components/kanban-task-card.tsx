/**
 * Kanban Task Card Component
 * Individual task card for the kanban board with drag-and-drop support
 */

'use client';
import { format } from 'date-fns';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, Calendar, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { AppRouter } from '@/lib/trpc/router';
import type { inferRouterOutputs } from '@trpc/server';
import { Checkbox } from '@/components/ui/checkbox';

type RouterOutput = inferRouterOutputs<AppRouter>;
type Task = RouterOutput['tasks']['list'][number];

interface KanbanTaskCardProps {
  task: Task;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (id: string) => void;
  isToggling: boolean;
}

export function KanbanTaskCard({
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  isToggling,
}: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.completed;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-grab active:cursor-grabbing transition-all duration-200 py-4 relative',
        isDragging && 'opacity-50 shadow-lg',
        isCompleted && 'opacity-60',
        'hover:shadow-md'
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent className="px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="absolute mt-2 top-0 right-2 mb-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(task.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Title and description */}
        <div className="flex items-center gap-2">
          <Checkbox
            checked={task.completed}
            onCheckedChange={() => onToggleComplete(task.id)}
            disabled={isToggling}
          />
          <h4 className={cn('font-medium text-sm leading-tight')}>{task.title}</h4>
        </div>
        {task.description && (
          <p className={cn('text-xs text-muted-foreground line-clamp-2 pt-2')}>
            {task.description}
          </p>
        )}

        {/* Footer with priority and due date */}
        {task.dueDate && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs text-muted-foreground mt-2',
              isOverdue && !task.completed && 'text-red-600 dark:text-red-400'
            )}
          >
            {isOverdue && !task.completed && <AlertCircle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            <span>{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
