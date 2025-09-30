'use client';

import { User, Bell, Shield, CreditCard, Monitor } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { Suspense } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentTab = pathname === '/settings' ? 'account' : pathname.split('/').pop() || 'account';

  const handleTabChange = (value: string) => {
    router.push(`/settings/${value === 'account' ? '' : value}`);
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col space-y-6">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="w-full max-w-3xl">
            <TabsTrigger value="account" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Billing</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Alerts</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Security</span>
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
  );
}
