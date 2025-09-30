import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from '@/components/app-sidebar';
import { ProfileImageProvider } from '@/hooks/use-profile-image';
import { DynamicBreadcrumb } from '@/components/dynamic-breadcrumb';

export default function LoggedInLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileImageProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <DynamicBreadcrumb />
            </div>
          </header>
          <div className="flex-1 space-y-8 p-8 pt-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ProfileImageProvider>
  );
}
