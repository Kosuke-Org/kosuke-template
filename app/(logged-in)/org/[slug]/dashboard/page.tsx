/**
 * Organization Dashboard
 * Main dashboard for organization-scoped view
 */

'use client';

import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useActiveOrganization } from '@/hooks/use-active-organization';

export default function OrgDashboardPage() {
  const { isLoading } = useActiveOrganization();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Redirect to the non-org dashboard for now
  // In the future, this would show org-specific dashboard
  redirect('/dashboard');
}
