/**
 * Sidebar Organization Switcher
 * Dropdown component for switching between organizations
 */

'use client';

import * as React from 'react';

import Link from 'next/link';

import { Building, ChevronsUpDown, Plus, Settings } from 'lucide-react';

import { organization } from '@/lib/auth/client';
import { getInitials } from '@/lib/utils';

import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';
import { useOrganizations } from '@/hooks/use-organizations';

import { CreateOrgDialog } from '@/components/create-org-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export function SidebarOrgSwitcher() {
  const { isMobile } = useSidebar();
  const { isLoading: isAuthLoading } = useAuth();
  const { organizations, isLoading } = useOrganizations();
  const { organization: activeOrganization, isLoading: isActivating } = useOrganization();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

  // Loading state
  if (isLoading || isActivating || isAuthLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar key={activeOrganization?.id} className="h-8 w-8 rounded-lg">
                {activeOrganization?.logo && (
                  <AvatarImage src={activeOrganization.logo} alt={activeOrganization?.name ?? ''} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground rounded-lg">
                  {activeOrganization?.name ? (
                    getInitials(activeOrganization.name)
                  ) : (
                    <Building className="h-4 w-4" />
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                {activeOrganization ? (
                  <>
                    <span className="truncate font-semibold">{activeOrganization.name}</span>
                    <span className="text-muted-foreground truncate text-xs">
                      {organizations.length}{' '}
                      {organizations.length === 1 ? 'workspace' : 'workspaces'}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground truncate text-xs">Select workspace</span>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>
            {organizations.map((org) => {
              const orgInitials = getInitials(org.name);
              const isActive = org.id === activeOrganization?.id;

              return (
                <DropdownMenuItem
                  key={org.id}
                  asChild
                  onSelect={async () => {
                    if (!isActive) {
                      await organization.setActive({
                        organizationId: org.id,
                        organizationSlug: org.slug,
                      });
                    }
                  }}
                >
                  <Link
                    href={`/org/${org.slug}/dashboard`}
                    className="flex cursor-pointer items-center gap-2 p-2"
                  >
                    <Avatar className="h-6 w-6 rounded-md">
                      {org.logo && <AvatarImage src={org.logo} alt={org.name} />}
                      <AvatarFallback className="bg-primary text-primary-foreground rounded-md text-xs">
                        {orgInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{org.name}</div>
                    </div>
                    {isActive && (
                      <div
                        className="bg-primary h-2 w-2 rounded-full"
                        aria-label="Active workspace"
                      />
                    )}
                  </Link>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            {activeOrganization && (
              <DropdownMenuItem asChild>
                <Link
                  href={`/org/${activeOrganization.slug}/settings`}
                  className="cursor-pointer gap-2 p-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Organization Settings</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => setIsCreateDialogOpen(true)}
              className="cursor-pointer gap-2 p-2"
            >
              <Plus className="h-4 w-4" />
              <span>Create Workspace</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <CreateOrgDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
    </SidebarMenu>
  );
}
