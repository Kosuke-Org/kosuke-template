/**
 * Organization General Settings Page
 * Update organization name and logo
 */

'use client';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { OrgGeneralForm } from './components/org-general-form';
import { OrgLogoUpload } from './components/org-logo-upload';

function OrgGeneralSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="h-3 w-full max-w-md" />
      </div>

      <div className="rounded-lg border p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

export default function OrgGeneralSettingsPage() {
  const { activeOrganization, isLoading } = useActiveOrganization();

  if (isLoading || !activeOrganization) {
    return <OrgGeneralSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <OrgLogoUpload organization={activeOrganization} />
      </Card>

      <Card>
        <OrgGeneralForm organization={activeOrganization} />
      </Card>
    </div>
  );
}
