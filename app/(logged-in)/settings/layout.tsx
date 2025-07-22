'use client';

import { User, Bell, Shield, CreditCard } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense } from 'react';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = pathname === '/settings' ? 'account' : pathname.split('/').pop() || 'account';

  const handleTabChange = (value: string) => {
    router.push(`/settings/${value === 'account' ? '' : value}`);
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage>Settings</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>
      <div className="container mx-auto py-6 px-4">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences.</p>
          </div>

          <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid grid-cols-4 w-full max-w-lg">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0" />
                <span>Account</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0" />
                <span>Billing</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="h-4 w-4 shrink-0" />
                <span>Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4 shrink-0" />
                <span>Security</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="h-32 w-full rounded bg-muted/50" />
              </div>
            }
          >
            <div className="max-w-2xl">{children}</div>
          </Suspense>
        </div>
      </div>
    </>
  );
}
