/**
 * Hook for managing the active organization
 * Handles organization selection, persistence, and URL slug
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useOrganizations } from './use-organizations';
import type { Organization } from './use-organizations';

const STORAGE_KEY = 'activeOrganizationId';

export function useActiveOrganization() {
  const { organizations, isLoading } = useOrganizations();
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Initialize active organization from localStorage or default to first
  useEffect(() => {
    if (isLoading || organizations.length === 0) return;

    // Check if there's a stored active organization
    const storedOrgId = localStorage.getItem(STORAGE_KEY);

    if (storedOrgId && organizations.some((org) => org.id === storedOrgId)) {
      // Use stored organization if it exists in the user's organizations
      setActiveOrgId(storedOrgId);
    } else {
      // Default to the first organization
      const firstOrg = organizations[0];
      setActiveOrgId(firstOrg.id);
      localStorage.setItem(STORAGE_KEY, firstOrg.id);
    }
  }, [organizations, isLoading]);

  // Get the active organization object
  const activeOrganization: Organization | null =
    organizations.find((org) => org.id === activeOrgId) ?? null;

  // Switch to a different organization
  const switchOrganization = (organizationId: string) => {
    const targetOrg = organizations.find((org) => org.id === organizationId);

    if (!targetOrg) {
      console.error('Organization not found:', organizationId);
      return;
    }

    // Update state and localStorage
    setActiveOrgId(organizationId);
    localStorage.setItem(STORAGE_KEY, organizationId);

    // Update URL to include organization slug
    // If current path starts with /org/, replace the slug
    if (pathname.startsWith('/org/')) {
      const pathParts = pathname.split('/');
      pathParts[2] = targetOrg.slug; // Replace slug in /org/[slug]/...
      router.push(pathParts.join('/'));
    } else {
      // If not in an org-scoped path, navigate to the org dashboard
      router.push(`/org/${targetOrg.slug}/dashboard`);
    }
  };

  // Get organization slug from URL
  const getOrgSlugFromUrl = (): string | null => {
    if (!pathname.startsWith('/org/')) return null;
    const pathParts = pathname.split('/');
    return pathParts[2] || null;
  };

  // Sync active organization with URL slug
  useEffect(() => {
    if (!activeOrganization || isLoading) return;

    const urlSlug = getOrgSlugFromUrl();
    if (urlSlug && urlSlug !== activeOrganization.slug) {
      // Find organization by slug in URL
      const orgBySlug = organizations.find((org) => org.slug === urlSlug);
      if (orgBySlug && orgBySlug.id !== activeOrgId) {
        // Switch to the organization from URL
        setActiveOrgId(orgBySlug.id);
        localStorage.setItem(STORAGE_KEY, orgBySlug.id);
      }
    }
  }, [pathname, activeOrganization, organizations, activeOrgId, isLoading]);

  return {
    activeOrganization,
    activeOrgId,
    switchOrganization,
    isLoading: isLoading || !activeOrgId,
  };
}
