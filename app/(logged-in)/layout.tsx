import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ProfileImageProvider } from '@/lib/hooks/use-profile-image';

interface LayoutProps {
  children: ReactNode;
}

async function AuthCheck({ children }: LayoutProps) {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
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
