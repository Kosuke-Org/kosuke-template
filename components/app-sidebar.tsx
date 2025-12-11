'use client';

import * as React from 'react';

import { CheckSquare, File, ReceiptText, Shield, SquareTerminal } from 'lucide-react';

import { useOrganization } from '@/hooks/use-organization';
import { usePermissions } from '@/hooks/use-permissions';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import { SidebarOrgSwitcher } from '@/components/sidebar-org-switcher';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { organization: activeOrganization, isLoading } = useOrganization();
  const { isAdmin } = usePermissions();

  // Generate org-aware navigation items
  const navItems = React.useMemo(() => {
    if (!activeOrganization) return [];

    const orgPrefix = `/org/${activeOrganization.slug}`;

    const mainItems = [
      {
        title: 'Dashboard',
        url: `${orgPrefix}/dashboard`,
        icon: SquareTerminal,
        isActive: true,
      },
      {
        title: 'Tasks',
        url: `${orgPrefix}/tasks`,
        icon: CheckSquare,
      },
      {
        title: 'Orders',
        url: `${orgPrefix}/orders`,
        icon: ReceiptText,
      },
      {
        title: 'Documents',
        url: `${orgPrefix}/documents`,
        icon: File,
      },
    ];

    return mainItems;
  }, [activeOrganization]);

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarOrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        {isLoading ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            {!activeOrganization ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <NavMain items={navItems} />
            )}

            {isAdmin && (
              <NavSecondary
                items={[
                  {
                    title: 'Admin',
                    url: '/admin',
                    icon: Shield,
                  },
                ]}
                className="mt-auto"
              />
            )}
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
