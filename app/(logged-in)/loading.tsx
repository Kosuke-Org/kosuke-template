import { StatsSkeleton } from '@/components/skeletons';
import { Skeleton } from '@/components/ui/skeleton';

// Page-specific skeleton for dashboard content only (header is handled by layout)
function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <StatsSkeleton />
      <div className="min-h-screen flex-1 rounded-xl bg-muted/50 md:min-h-min p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-48" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-lg border p-4 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Loading() {
  return <DashboardSkeleton />;
}
