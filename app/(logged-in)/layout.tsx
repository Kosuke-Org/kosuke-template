import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { stackServerApp } from '../../stack';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ProfileImageProvider } from '@/lib/hooks/use-profile-image';

interface LayoutProps {
  children: ReactNode;
}

async function AuthCheck({ children }: LayoutProps) {
  const user = await stackServerApp.getUser();

  if (!user) {
    redirect('/handler/sign-in');
  }

  return <>{children}</>;
}

export default async function LoggedInLayout({ children }: LayoutProps) {
  return (
    <AuthCheck>
      <ProfileImageProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </ProfileImageProvider>
    </AuthCheck>
  );
}
