import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ===============================
// REUSABLE SKELETON COMPONENTS
// ===============================

// Card skeleton for subscription cards, settings cards, etc.
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border p-6 space-y-4', className)}>
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
        <div key={i} className="rounded-xl bg-muted/50 p-6 space-y-2">
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

// ===============================
// PAGE-LEVEL SKELETONS
// ===============================

// Dashboard skeleton - matches the dashboard layout with header, stats, and main content
export function DashboardSkeleton() {
  return (
    <>
      {/* Header with breadcrumb and sidebar trigger */}
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-4 w-px bg-border" />
          <BreadcrumbSkeleton items={2} className="mr-2" />
        </div>
      </header>

      {/* Main dashboard content */}
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <StatsSkeleton />
        <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-6">
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
    </>
  );
}

// Billing page skeleton - comprehensive billing with current plan, upgrade options, and billing info
export function BillingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-6 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Current Plan Card */}
      <div className="rounded-lg border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-4 w-32 mb-2" />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="text-right space-y-1">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <BadgeSkeleton />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        <Skeleton className="h-px w-full bg-border" />

        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </div>
      </div>

      {/* Cancel Subscription Card (conditional) */}
      <div className="rounded-lg border border-destructive/20 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-36" />
        </div>
        <Skeleton className="h-4 w-64" />

        <div className="rounded-md bg-destructive/10 p-4 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>

        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        <ButtonSkeleton className="bg-destructive" />
      </div>

      {/* Upgrade Options */}
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-56" />

        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="relative rounded-lg border p-6 space-y-4">
              {i === 0 && <BadgeSkeleton className="absolute top-4 right-4" />}
              <div className="space-y-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-32" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
              <ButtonSkeleton className="w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Billing Information */}
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />

        <div className="rounded-md bg-muted p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );
}

// Profile Settings skeleton
export function ProfileSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6">
        <div className="flex items-center space-x-4 mb-4">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-48 mb-4" />

        <div className="flex flex-col md:flex-row gap-8">
          {/* Profile Image Section */}
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-32 w-32 rounded-lg" />
            <ButtonSkeleton />
          </div>

          {/* Profile Information */}
          <div className="flex-1 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2">
                  <Skeleton className="h-10 flex-1" />
                  <ButtonSkeleton size="sm" />
                  <ButtonSkeleton size="sm" />
                </div>
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Notifications Settings skeleton
export function NotificationsSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <ToggleSkeleton key={i} />
          ))}
        </div>

        <div className="pt-4 border-t space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-56" />
        </div>

        <ButtonSkeleton className="w-full sm:w-auto" />
      </div>
    </div>
  );
}

// Security Settings skeleton
export function SecuritySettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-destructive/20 p-6 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />

          <div className="rounded-md bg-destructive/10 p-4 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>

          <div className="flex gap-2">
            <ButtonSkeleton />
            <ButtonSkeleton className="bg-destructive" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Sidebar skeleton
export function SidebarSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center space-x-3 p-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Navigation sections */}
      <div className="space-y-6">
        {/* Platform section */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 mb-3" />
          {Array.from({ length: 4 }).map((_, i) => (
            <NavItemSkeleton key={i} />
          ))}
        </div>

        {/* Projects section */}
        <div className="space-y-2">
          <Skeleton className="h-3 w-16 mb-3" />
          {Array.from({ length: 3 }).map((_, i) => (
            <NavItemSkeleton key={i} />
          ))}
        </div>

        {/* Secondary navigation */}
        <div className="space-y-2 mt-auto">
          {Array.from({ length: 2 }).map((_, i) => (
            <NavItemSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* User section */}
      <div className="mt-auto pt-4 border-t">
        <UserSkeleton />
      </div>
    </div>
  );
}

// Settings layout skeleton (with tabs)
export function SettingsLayoutSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Header */}
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-4 w-px bg-border" />
          <BreadcrumbSkeleton items={1} />
        </div>
      </header>

      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col space-y-6">
          {/* Page title */}
          <div className="flex flex-col space-y-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-64" />
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-4 w-full max-w-lg gap-1 rounded-lg bg-muted p-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-md" />
            ))}
          </div>

          {/* Content */}
          <div className="max-w-2xl">{children}</div>
        </div>
      </div>
    </>
  );
}
