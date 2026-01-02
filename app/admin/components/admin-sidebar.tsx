'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  Activity,
  ArrowLeft,
  Building2,
  Database,
  FileText,
  LayoutDashboard,
  Settings,
  Shield,
  Users,
} from 'lucide-react';

import { AUTH_ROUTES } from '@/lib/auth';

import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const adminNavItems = [
    {
      title: 'Dashboard',
      url: '/admin',
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: 'Users',
      url: '/admin/users',
      icon: Users,
    },
    {
      title: 'Organizations',
      url: '/admin/organizations',
      icon: Building2,
    },
    {
      title: 'Jobs',
      url: '/admin/jobs',
      icon: Activity,
    },
    {
      title: 'RAG Management',
      url: '/admin/rag',
      icon: Database,
      items: [
        {
          title: 'Settings',
          url: '/admin/rag/settings',
          icon: Settings,
        },
      ],
    },
    {
      title: 'LLM Logs',
      url: '/admin/llm-logs',
      icon: FileText,
    },
  ];

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Shield className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Admin Panel</span>
                  <span className="text-muted-foreground text-xs">Super Admin Access</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={adminNavItems} />
        <SidebarMenu className="mt-auto">
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href={AUTH_ROUTES.ROOT}>
                <ArrowLeft />
                <span>Back to App</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
