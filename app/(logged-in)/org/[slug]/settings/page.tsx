/**
 * Organization General Settings Page
 * Update organization name and logo
 */

'use client';

import { Loader2 } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { OrgGeneralForm } from './components/org-general-form';
import { OrgLogoUpload } from './components/org-logo-upload';

export default function OrgGeneralSettingsPage() {
  const { activeOrganization, isLoading } = useActiveOrganization();

  if (isLoading || !activeOrganization) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">General Settings</h3>
        <p className="text-sm text-muted-foreground">
          Update your organization&apos;s name and logo.
        </p>
      </div>
      <Separator />
      <OrgLogoUpload organization={activeOrganization} />
      <Separator />
      <OrgGeneralForm organization={activeOrganization} />
    </div>
  );
}
