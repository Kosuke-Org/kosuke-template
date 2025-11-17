import { cn } from '@/lib/utils';

import { Skeleton } from '@/components/ui/skeleton';

// ===============================
// REUSABLE SKELETON COMPONENTS
// ===============================

// Card skeleton for subscription cards, settings cards, etc.
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4 rounded-lg border p-6', className)}>
      <div className="flex items-center space-x-4">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-5 w-32" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-9 w-24 rounded" />
      </div>
    </div>
  );
}

// Form skeleton for settings forms
export function FormSkeleton({ fields = 3, className }: { fields?: number; className?: string }) {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-3 w-48" />
        </div>
      ))}
      <Skeleton className="h-9 w-32 rounded" />
    </div>
  );
}

// User avatar and info skeleton
export function UserSkeleton({
  showEmail = true,
  className,
}: {
  showEmail?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center space-x-3', className)}>
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-20" />
        {showEmail && <Skeleton className="h-3 w-32" />}
      </div>
    </div>
  );
}

// Navigation menu item skeleton
export function NavItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center space-x-3 px-3 py-2', className)}>
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// Table row skeleton
export function TableRowSkeleton({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center space-x-4 p-4', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

// Toggle switch skeleton (for notifications page)
export function ToggleSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-6 w-11 rounded-full" />
    </div>
  );
}

// Stats or metrics skeleton
export function StatsSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3', className)}>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-muted/50 space-y-2 rounded-xl p-6">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

// Badge or tag skeleton
export function BadgeSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-5 w-16 rounded-full', className)} />;
}

// Button skeleton
export function ButtonSkeleton({
  size = 'default',
  className,
}: {
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const heights = {
    sm: 'h-8',
    default: 'h-9',
    lg: 'h-10',
  };

  return <Skeleton className={cn(heights[size], 'w-24 rounded', className)} />;
}

// Breadcrumb skeleton
export function BreadcrumbSkeleton({
  items = 3,
  className,
}: {
  items?: number;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-2">
          <Skeleton className="h-4 w-16" />
          {i < items - 1 && <Skeleton className="h-3 w-1" />}
        </div>
      ))}
    </div>
  );
}
