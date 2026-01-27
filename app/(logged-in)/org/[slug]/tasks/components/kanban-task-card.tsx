/**
 * Kanban Task Card Component
 * Individual task card for the kanban board with drag-and-drop support
 */

'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import { format } from 'date-fns';
import { AlertCircle, Calendar, MoreVertical, Pencil, Trash2 } from 'lucide-react';

import type { AppRouter } from '@/lib/trpc/router';
import { cn } from '@/lib/utils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type RouterOutput = inferRouterOutputs<AppRouter>;
type RouterInput = inferRouterInputs<AppRouter>;
type Task = RouterOutput['tasks']['list'][number];
type UpdateTaskInput = RouterInput['tasks']['update'];

const priorityColors = {
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  high: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
  urgent: 'bg-red-600/10 text-red-700 dark:text-red-400 border-red-600/20 font-bold',
};

interface KanbanTaskCardProps {
  task: Task;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleComplete: (input: UpdateTaskInput) => void;
}

export function KanbanTaskCard({ task, onEdit, onDelete, onToggleComplete }: KanbanTaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.completed;
  const isOverdue = task.isOverdue;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative cursor-grab py-4 transition-all duration-200 active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg',
        isCompleted && 'opacity-60',
        'hover:shadow-md'
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent className="px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild className="absolute top-0 right-2 mt-2 mb-0">
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
            onCheckedChange={() => onToggleComplete({ id: task.id, completed: !task.completed })}
          />
          <h4 className={cn('text-sm leading-tight font-medium')}>{task.title}</h4>
        </div>
        {task.description && (
          <p className={cn('text-muted-foreground line-clamp-2 pt-2 text-xs')}>
            {task.description}
          </p>
        )}

        {/* Footer with priority and due date */}
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className={priorityColors[task.priority]}>
            {task.priority}
          </Badge>
          {task.dueDate && (
            <div
              className={cn(
                'text-muted-foreground flex items-center gap-1 text-xs',
                isOverdue && !task.completed && 'text-red-600 dark:text-red-400'
              )}
            >
              {isOverdue && !task.completed && <AlertCircle className="h-3 w-3" />}
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(task.dueDate), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
