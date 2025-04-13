import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

interface LayoutProps {
  children: ReactNode;
}

async function AuthCheck({ children }: LayoutProps) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return <>{children}</>;
}

export default async function LoggedInLayout({ children }: LayoutProps) {
  return (
    <AuthCheck>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </AuthCheck>
  );
}
