/**
 * DataTable Column Header Component
 * Provides sorting controls for server-side sorting
 */
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';

interface DataTableColumnHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: React.ReactNode;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | false;
  onSort?: () => void;
}

export function DataTableColumnHeader({
  title,
  icon,
  sortable = false,
  sortDirection = false,
  onSort,
  className,
}: DataTableColumnHeaderProps) {
  if (!sortable || !onSort) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {icon}
        <span>{title}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button variant="ghost" size="sm" className="-ml-3 h-8" onClick={onSort}>
        {icon}
        <span>{title}</span>
        {sortDirection === 'desc' ? (
          <ArrowDown className="h-4 w-4" />
        ) : sortDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4" />
        ) : (
          <ChevronsUpDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
