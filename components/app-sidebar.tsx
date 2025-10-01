'use client';

import * as React from 'react';
import { Blocks, LifeBuoy, Send, SquareTerminal } from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import { SidebarOrgSwitcher } from '@/components/sidebar-org-switcher';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { useActiveOrganization } from '@/hooks/use-active-organization';
import { Skeleton } from '@/components/ui/skeleton';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { activeOrganization, isLoading } = useActiveOrganization();

  // Generate org-aware navigation items
  const navItems = React.useMemo(() => {
    if (!activeOrganization) {
      return {
        navMain: [
          {
            title: 'Dashboard',
            url: '/dashboard',
            icon: SquareTerminal,
            isActive: true,
          },
          {
            title: 'Modules',
            url: '#',
            icon: Blocks,
            items: [
              {
                title: 'Tasks',
                url: '/tasks',
              },
              {
                title: 'Docs',
                url: '/docs',
              },
            ],
          },
        ],
        navSecondary: [
          {
            title: 'Support',
            url: '#',
            icon: LifeBuoy,
          },
          {
            title: 'Feedback',
            url: '#',
            icon: Send,
          },
        ],
      };
    }

    const orgPrefix = `/org/${activeOrganization.slug}`;

    return {
      navMain: [
        {
          title: 'Dashboard',
          url: `${orgPrefix}/dashboard`,
          icon: SquareTerminal,
          isActive: true,
        },
        {
          title: 'Modules',
          url: '#',
          icon: Blocks,
          items: [
            {
              title: 'Tasks',
              url: `${orgPrefix}/tasks`,
            },
            {
              title: 'Docs',
              url: `${orgPrefix}/docs`,
            },
          ],
        },
      ],
      navSecondary: [
        {
          title: 'Support',
          url: '#',
          icon: LifeBuoy,
        },
        {
          title: 'Feedback',
          url: '#',
          icon: Send,
        },
      ],
    };
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
            <NavMain items={navItems.navMain} />
            <NavSecondary items={navItems.navSecondary} className="mt-auto" />
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
