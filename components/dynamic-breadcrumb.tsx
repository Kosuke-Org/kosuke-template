'use client';

import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

// Define human-readable names for routes
const routeNames: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Settings',
  billing: 'Billing',
  appearance: 'Appearance',
  notifications: 'Notifications',
  security: 'Security',
  success: 'Success',
  account: 'Account',
  tasks: 'Tasks',
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();

  // Split the pathname and filter out empty strings
  const pathSegments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs for root page
  if (pathSegments.length === 0) {
    return null;
  }

  let breadcrumbItems: Array<{ href: string; name: string; isLast: boolean }> = [];

  // Handle different route patterns
  if (pathname === '/dashboard') {
    // Dashboard page - just show "Dashboard"
    breadcrumbItems = [{ href: '/dashboard', name: 'Dashboard', isLast: true }];
  } else if (pathname === '/settings') {
    // Base settings page (account) - show "Settings > Account"
    breadcrumbItems = [
      { href: '/settings', name: 'Settings', isLast: false },
      { href: '/settings', name: 'Account', isLast: true },
    ];
  } else if (pathname.startsWith('/settings/')) {
    // Nested settings pages - show "Settings > [SubPage]"
    const subPage = pathSegments[pathSegments.length - 1];
    const displayName = routeNames[subPage] || subPage.charAt(0).toUpperCase() + subPage.slice(1);

    breadcrumbItems = [
      { href: '/settings', name: 'Settings', isLast: false },
      { href: pathname, name: displayName, isLast: true },
    ];
  } else {
    // Default handling for other routes
    breadcrumbItems = pathSegments.map((segment, index) => {
      const href = `/${pathSegments.slice(0, index + 1).join('/')}`;
      const isLast = index === pathSegments.length - 1;
      const displayName = routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

      return {
        href,
        name: displayName,
        isLast,
      };
    });
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <div key={`breadcrumb-${item.href}-${index}`} className="contents">
            <BreadcrumbItem className={index === 0 ? 'hidden md:block' : ''}>
              {item.isLast ? (
                <BreadcrumbPage>{item.name}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={item.href}>{item.name}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator className="hidden md:block" />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
