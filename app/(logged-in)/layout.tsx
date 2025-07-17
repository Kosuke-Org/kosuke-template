import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { ProfileImageProvider } from '@/hooks/use-profile-image';

export default function LoggedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileImageProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </ProfileImageProvider>
  );
}
