'use client';

import * as React from 'react';

import { useParams, useRouter } from 'next/navigation';

import {
  Bot,
  CheckSquare,
  File,
  Loader2,
  ReceiptText,
  Shield,
  SquareTerminal,
  Trash2,
} from 'lucide-react';

import { ChatSession } from '@/lib/types/documents';

import { useChatSession } from '@/hooks/use-chat';
import { useOrganization } from '@/hooks/use-organization';
import { usePermissions } from '@/hooks/use-permissions';

import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import { SidebarOrgSwitcher } from '@/components/sidebar-org-switcher';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { chatId } = useParams();
  const { organization: activeOrganization, isLoading } = useOrganization();
  const { isAdmin } = usePermissions();
  const { sessions, deleteSession, isDeletingSession } = useChatSession({
    organizationId: activeOrganization?.id ?? '',
  });
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [sessionToDelete, setSessionToDelete] = React.useState<ChatSession | null>(null);

  const handleDeleteConfirm = async () => {
    if (sessionToDelete) {
      deleteSession(sessionToDelete.id);

      if (chatId === sessionToDelete.id) {
        router.push(`/org/${activeOrganization?.slug}/assistant`);
      }
    }
    setDeleteDialogOpen(false);
    setSessionToDelete(null);
  };

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
      {
        title: 'Assistant',
        url: `${orgPrefix}/assistant`,
        icon: Bot,
        ...(sessions.length > 0
          ? {
              items: sessions.map((session) => ({
                title: session.title,
                url: `${orgPrefix}/assistant/${session.id}`,
                icon: Bot,
                actions: [
                  {
                    title: 'Delete',
                    icon: Trash2,
                    className: '!text-destructive',
                    onClick: () => {
                      setSessionToDelete(session);
                      setDeleteDialogOpen(true);
                    },
                  },
                ],
              })),
            }
          : []),
      },
    ];

    return mainItems;
  }, [activeOrganization, sessions]);

  return (
    <>
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

      <AlertDialog open={deleteDialogOpen || isDeletingSession} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete chat{' '}
              <span className="font-bold">&quot;{sessionToDelete?.title}&quot;</span>? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSession}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeletingSession}>
              {isDeletingSession && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
