/**
 * Organization General Settings Page
 * Update organization name and logo
 */

'use client';

import { useOrganization } from '@/hooks/use-organization';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { OrgGeneralForm } from './components/org-general-form';
import { OrgLogoUpload } from './components/org-logo-upload';

function OrgGeneralSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-6 rounded-lg border p-6">
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

      <div className="space-y-6 rounded-lg border p-6">
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
  const { organization, isLoading } = useOrganization();

  if (isLoading || !organization) {
    return <OrgGeneralSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <OrgLogoUpload organization={organization} />
      </Card>

      <Card>
        <OrgGeneralForm organization={organization} />
      </Card>
    </div>
  );
}
