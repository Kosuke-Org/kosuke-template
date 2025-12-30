'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

import { BreadcrumbSkeleton } from './skeletons';

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
  documents: 'Documents',
  assistant: 'Assistant',
  admin: 'Admin',
  users: 'Users',
  organizations: 'Organizations',
  jobs: 'Jobs',
  rag: 'RAG',
  'llm-logs': 'LLM Logs',
};

export function DynamicBreadcrumb() {
  const pathname = usePathname();
  const { organization: activeOrganization, isLoading } = useOrganization();
  const { isLoading: isAuthLoading } = useAuth();

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

    if (activeOrganization?.slug === orgSlug) {
      breadcrumbItems.push({
        href: `/org/${orgSlug}/settings`,
        name: activeOrganization?.name ?? '',
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
  } else if (pathname.startsWith('/admin')) {
    // Admin routes: Admin > Section > Detail
    breadcrumbItems.push({
      href: '/admin',
      name: 'Admin',
      isLast: pathSegments.length === 1,
    });

    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const isLast = i === pathSegments.length - 1;
      const href = `/${pathSegments.slice(0, i + 1).join('/')}`;

      breadcrumbItems.push({
        href: isLast ? null : href,
        name: getDisplayName(segment),
        isLast,
      });
    }
  }

  if (isAuthLoading || isLoading) {
    return <BreadcrumbSkeleton items={breadcrumbItems.length} />;
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
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.name}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {!item.isLast && <BreadcrumbSeparator className="hidden md:block" />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
