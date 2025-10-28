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
import { useActiveOrganization } from '@/hooks/use-active-organization';

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
  orders: 'Orders',
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const { activeOrganization } = useActiveOrganization();

  // Split the pathname and filter out empty strings
  const pathSegments = pathname.split('/').filter(Boolean);

  // Don't show breadcrumbs for root page
  if (pathSegments.length === 0) {
    return null;
  }

  let breadcrumbItems: Array<{ href: string | null; name: string; isLast: boolean }> = [];

  const getDisplayName = (segment: string) => {
    return routeNames[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  // Settings routes: Settings > Subpage
  if (pathname.startsWith('/settings')) {
    const subPage = pathSegments[1] || 'account';
    breadcrumbItems = [
      { href: '/settings', name: 'Settings', isLast: false },
      { href: pathname, name: getDisplayName(subPage), isLast: true },
    ];
  } else if (pathname.startsWith('/org/')) {
    const orgSlug = pathSegments[1];

    breadcrumbItems.push({
      href: `/org/${orgSlug}/settings`,
      name: activeOrganization?.name || 'Organization',
      isLast: pathSegments.length === 2,
    });

    for (let i = 2; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const isLast = i === pathSegments.length - 1;
      const href = `/${pathSegments.slice(0, i + 1).join('/')}`;

      breadcrumbItems.push({
        href,
        name: getDisplayName(segment),
        isLast,
      });
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <div key={`breadcrumb-${item.href}-${index}`} className="contents">
            <BreadcrumbItem className={index === 0 ? 'hidden md:block' : ''}>
              {item.isLast || item.href === null ? (
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
