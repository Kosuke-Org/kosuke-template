'use client';

import { Suspense } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Bell, CreditCard, Monitor, Shield, User } from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTab = pathname === '/settings' ? 'account' : pathname.split('/').pop() || 'account';

  return (
    <div className="flex max-w-4xl flex-col space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs value={currentTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="account" className="flex items-center gap-2" asChild>
            <Link href="/settings">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2" asChild>
            <Link href="/settings/appearance">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2" asChild>
            <Link href="/settings/billing">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2" asChild>
            <Link href="/settings/notifications">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </Link>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2" asChild>
            <Link href="/settings/security">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
            </Link>
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
