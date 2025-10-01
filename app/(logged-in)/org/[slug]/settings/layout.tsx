/**
 * Organization Settings Layout
 * Provides navigation tabs for different settings sections
 */

'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Settings, Users } from 'lucide-react';

import { Separator } from '@/components/ui/separator';

export default function OrgSettingsLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const slug = params.slug as string;

  const baseUrl = `/org/${slug}/settings`;
  const currentTab = pathname === baseUrl ? 'general' : pathname.split('/').pop() || 'general';

  return (
    <div className="space-y-6 p-6 pb-16">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Organization Settings</h2>
        <p className="text-muted-foreground">
          Manage your organization&apos;s settings, members, and permissions.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="-mx-4 lg:w-1/5">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            <Link
              href={baseUrl}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                currentTab === 'general'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <Settings className="h-4 w-4" />
              General
            </Link>
            <Link
              href={`${baseUrl}/members`}
              className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                currentTab === 'members'
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <Users className="h-4 w-4" />
              Members
            </Link>
          </nav>
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
