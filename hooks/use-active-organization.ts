/**
 * Hook for managing the active organization
 * Uses Clerk's orgSlug from session as source of truth
 */

'use client';

import { useEffect } from 'react';
import { useAuth, useOrganizationList } from '@clerk/nextjs';
import { usePathname, useRouter } from 'next/navigation';
import { useOrganizations } from './use-organizations';
import type { Organization } from './use-organizations';

export function useActiveOrganization() {
  const { orgSlug } = useAuth();
  const { setActive } = useOrganizationList();
  const { organizations, isLoading } = useOrganizations();
  const router = useRouter();
  const pathname = usePathname();

  // Get active organization from Clerk's orgSlug (source of truth)
  const activeOrganization: Organization | null =
    organizations.find((org) => org.slug === orgSlug) ?? null;

  // Initialize active org and sync with URL changes
  useEffect(() => {
    if (isLoading) return;

    // If no organizations available, nothing to do
    if (organizations.length === 0) return;

    // Extract org slug from URL (if on org route)
    const urlSlug = pathname.startsWith('/org/') ? pathname.split('/')[2] : null;

    // No active org in session → set first org as default
    if (!orgSlug) {
      const firstOrg = organizations[0];
      setActive?.({ organization: firstOrg.slug });
      return;
    }

    // URL has org slug that differs from session → sync session to URL
    // This handles direct navigation (user clicks link, types URL, or uses back/forward)
    if (urlSlug && urlSlug !== orgSlug) {
      const orgBySlug = organizations.find((org) => org.slug === urlSlug);
      if (orgBySlug) {
        // Valid org in URL → switch to it
        setActive?.({ organization: orgBySlug.slug });
      } else {
        // Invalid org slug in URL → redirect to active org's dashboard
        router.replace(`/org/${orgSlug}/dashboard`);
      }
    }
  }, [pathname, orgSlug, organizations, isLoading, setActive, router]);

  return {
    activeOrganization,
    activeOrgId: activeOrganization?.id ?? null,
    isLoading,
  };
}
