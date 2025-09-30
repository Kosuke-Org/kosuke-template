'use client';

import { useState } from 'react';
import { MoreVertical, Pencil, Trash2, Calendar, AlertCircle } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TaskPriority } from '@/lib/types';

interface TaskItemProps {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  priority: TaskPriority;
  dueDate: Date | null;
  isOverdue: boolean;
  onToggleComplete: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  isToggling?: boolean;
}

const priorityColors = {
  low: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  high: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20',
};

export function TaskItem({
  id,
  title,
  description,
  completed,
  priority,
  dueDate,
  isOverdue,
  onToggleComplete,
  onEdit,
  onDelete,
  isToggling,
}: TaskItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Card
      className={cn(
        'py-3 transition-all hover:shadow-md',
        completed && 'opacity-60',
        isOverdue && !completed && 'border-red-500/50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardHeader className="flex flex-row items-start gap-4 space-y-0 px-6 py-0">
        <Checkbox
          checked={completed}
          onCheckedChange={() => onToggleComplete(id)}
          disabled={isToggling}
          className="mt-1"
        />
        <div className="flex-1 space-y-1">
          <h3
            className={cn(
              'font-medium leading-none',
              completed && 'line-through text-muted-foreground'
            )}
          >
            {title}
          </h3>
          {description && (
            <p className={cn('text-sm text-muted-foreground', completed && 'line-through')}>
              {description}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="outline" className={priorityColors[priority]}>
              {priority}
            </Badge>
            {dueDate && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs text-muted-foreground',
                  isOverdue && !completed && 'text-red-600 dark:text-red-400'
                )}
              >
                {isOverdue && !completed && <AlertCircle className="h-3 w-3" />}
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(dueDate), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-8 w-8 p-0 transition-opacity', !isHovered && 'opacity-0')}
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
    </Card>
  );
}
