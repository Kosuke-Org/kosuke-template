/**
 * Organization Documentation Page
 * TODO: Make docs fully org-scoped
 */

'use client';

import { useActiveOrganization } from '@/hooks/use-active-organization';
import { Skeleton } from '@/components/ui/skeleton';

function DocsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-96" />
      </div>
    </div>
  );
}

export default function OrgDocsPage() {
  const { isLoading } = useActiveOrganization();

  if (isLoading) {
    return <DocsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Documentation 🚧</h1>
        <p className="text-muted-foreground">
          Coming soon! Documentation is currently under construction. Check back soon!
        </p>
      </div>
    </div>
  );
}
