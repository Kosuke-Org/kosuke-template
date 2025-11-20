/**
 * Organization Settings Layout
 * Provides navigation tabs for different settings sections
 */

'use client';

import { Suspense } from 'react';

import { useParams, usePathname, useRouter } from 'next/navigation';

import { Settings, Users } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OrgSettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const slug = params.slug as string;

  const baseUrl = `/org/${slug}/settings`;
  const currentTab = pathname === baseUrl ? 'general' : pathname.split('/').pop() || 'general';

  const handleTabChange = (value: string) => {
    router.push(`${baseUrl}${value === 'general' ? '' : `/${value}`}`);
  };

  return (
    <div className="flex max-w-4xl flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization&apos;s settings, members, and permissions.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="general" className="flex flex-1 items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="members" className="flex flex-1 items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Members</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="bg-muted/50 h-32 w-full rounded" />
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}
