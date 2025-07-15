import { ReactNode } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { ProfileImageProvider } from '@/lib/hooks/use-profile-image';

interface LayoutProps {
  children: ReactNode;
}

export default function LoggedInLayout({ children }: LayoutProps) {
  return (
    <ProfileImageProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ProfileImageProvider>
  );
}
