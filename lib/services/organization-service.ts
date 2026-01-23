/**
 * Organization Service
 * Handles organization CRUD operations, logo management, and utilities
 */
import { auth } from '@/lib/auth/providers';
import { createFreeTierSubscription, deleteStripeCustomer } from '@/lib/billing/operations';
import type { NewOrganization, Organization, User } from '@/lib/db/schema';
import { generateUniqueOrgSlug, switchToNextOrganization } from '@/lib/organizations';
import { ERRORS } from '@/lib/services/constants';
import { deleteProfileImage, uploadProfileImage } from '@/lib/storage';
import { ORG_ROLES } from '@/lib/types/organization';

/**
 * Get all organizations for a user
 */
export async function getUserOrganizations(params: { userId: User['id']; headers: Headers }) {
  const result = await auth.api.listOrganizations({
    query: {
      userId: params.userId,
    },
    headers: params.headers,
  });

  return result;
}

/**
 * Get a single organization by ID
 */
export async function getOrganizationById(params: {
  organizationId: Organization['id'];
  headers: Headers;
}) {
  const result = await auth.api.getFullOrganization({
    query: {
      organizationId: params.organizationId,
      membersLimit: 100,
    },
    headers: params.headers,
  });

  return result;
}

/**
 * Get a single organization by slug
 * @throws Error if organization not found
 */
export async function getOrganizationBySlug(params: {
  slug: Organization['slug'];
  headers: Headers;
}) {
  try {
    const result = await auth.api.getFullOrganization({
      query: {
        organizationSlug: params.slug,
      },
      headers: params.headers,
    });

    return result;
  } catch {
    throw new Error(`Organization ${params.slug} not found`, { cause: ERRORS.NOT_FOUND });
  }
}

/**
 * Create a new organization
 * Generates unique slug and sets as active organization
 */
export async function createOrganization(params: {
  name: NewOrganization['name'];
  headers: Headers;
}) {
  const slug = await generateUniqueOrgSlug(params.name);

  try {
    const result = await auth.api.createOrganization({
      body: {
        name: params.name,
        slug,
        keepCurrentActiveOrganization: false,
      },
      headers: params.headers,
    });

    // Explicitly set the active organization to refresh the cookie cache
    // This ensures the session cookie is updated with the new organization
    if (result?.id) {
      await auth.api.setActiveOrganization({
        body: {
          organizationId: result.id,
        },
        headers: params.headers,
      });

      // Get user session to get email for Stripe customer
      const session = await auth.api.getSession({ headers: params.headers });
      const userEmail = session?.user?.email || '';

      // Create free-tier subscription for the new organization
      const subscriptionResult = await createFreeTierSubscription({
        organizationId: result.id,
        customerEmail: userEmail,
      });

      if (!subscriptionResult.success) {
        console.error('Failed to create free-tier subscription:', subscriptionResult.message);
        // Don't fail organization creation if subscription creation fails
        // The subscription can be created manually later if needed
      }
    }

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to create organization', {
      cause: ERRORS.BAD_REQUEST,
    });
  }
}

/**
 * Update organization details
 */
export async function updateOrganization(params: {
  organizationId: Organization['id'];
  data: {
    name?: NewOrganization['name'];
    slug?: NewOrganization['slug'];
    metadata?: Record<string, unknown>;
  };
  headers: Headers;
}) {
  try {
    const result = await auth.api.updateOrganization({
      body: {
        data: params.data,
        organizationId: params.organizationId,
      },
      headers: params.headers,
    });

    return result;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to update organization', {
      cause: ERRORS.BAD_REQUEST,
    });
  }
}

/**
 * Delete an organization and switch to next available organization
 * Only organization owners can delete organizations
 * @throws Error if user is not owner
 */
export async function deleteOrganization(params: {
  organizationId: Organization['id'];
  userId: User['id'];
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  // Check if user is owner
  const { role } = await auth.api.getActiveMemberRole({
    headers: params.headers,
  });

  if (role !== ORG_ROLES.OWNER) {
    throw new Error('Only organization owners can delete the organization', {
      cause: ERRORS.FORBIDDEN,
    });
  }

  // Get organization to check for logo
  const organization = await auth.api.getFullOrganization({
    query: {
      organizationId: params.organizationId,
    },
    headers: params.headers,
  });

  if (!organization) {
    throw new Error('Organization not found', { cause: ERRORS.NOT_FOUND });
  }

  // Delete organization logo if it exists
  if (organization.logo) {
    await deleteProfileImage(organization.logo);
  }

  // Delete Stripe customer (this will cancel all subscriptions automatically)
  await deleteStripeCustomer(params.organizationId);

  // Delete the organization
  await auth.api.deleteOrganization({
    body: {
      organizationId: params.organizationId,
    },
    headers: params.headers,
  });

  // Switch to another organization or set active to null if none remain
  await switchToNextOrganization(params.userId);

  return {
    success: true,
    message: 'Organization deleted successfully',
  };
}

/**
 * Upload organization logo with authorization check
 * Only admins and owners can upload logos
 * @throws Error if user is not admin/owner or file validation fails
 */
export async function uploadOrganizationLogo(params: {
  fileBase64: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml';
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  try {
    // Check authorization
    const { role } = await auth.api.getActiveMemberRole({
      headers: params.headers,
    });

    if (role !== ORG_ROLES.ADMIN && role !== ORG_ROLES.OWNER) {
      throw new Error('Only organization admins and owners can upload the logo', {
        cause: ERRORS.FORBIDDEN,
      });
    }

    // Get organization
    const organization = await auth.api.getFullOrganization({
      headers: params.headers,
    });

    if (!organization?.id) {
      throw new Error('Organization not found', { cause: ERRORS.NOT_FOUND });
    }

    // Validate file size
    const base64Data = params.fileBase64.split(',')[1] || params.fileBase64;
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 2 * 1024 * 1024) {
      throw new Error('File size must be less than 2MB', { cause: ERRORS.BAD_REQUEST });
    }

    // Upload to storage
    const file = new File([buffer], params.fileName, { type: params.mimeType });
    const logoUrl = await uploadProfileImage(file, organization.id);

    // Update organization with logo URL
    await auth.api.updateOrganization({
      body: {
        data: {
          logo: logoUrl,
        },
        organizationId: organization.id,
      },
      headers: params.headers,
    });

    return {
      success: true,
      message: 'Organization logo uploaded successfully',
    };
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : 'Failed to upload logo', {
      cause: error instanceof Error && error.cause ? error.cause : ERRORS.BAD_REQUEST,
    });
  }
}

/**
 * Delete organization logo with authorization check
 * Only admins and owners can delete logos
 * @throws Error if user is not admin/owner or logo not found
 */
export async function deleteOrganizationLogo(params: {
  headers: Headers;
}): Promise<{ success: boolean; message: string }> {
  // Check authorization
  const { role } = await auth.api.getActiveMemberRole({
    headers: params.headers,
  });

  if (role !== ORG_ROLES.ADMIN && role !== ORG_ROLES.OWNER) {
    throw new Error('Only organization admins and owners can delete the logo', {
      cause: ERRORS.FORBIDDEN,
    });
  }

  // Get organization
  const organization = await auth.api.getFullOrganization({
    headers: params.headers,
  });

  if (!organization?.logo) {
    throw new Error('Organization logo not found', { cause: ERRORS.NOT_FOUND });
  }

  // Delete from storage
  await deleteProfileImage(organization.logo);

  // Update organization to remove logo URL
  await auth.api.updateOrganization({
    body: {
      data: {
        logo: '',
      },
    },
    headers: params.headers,
  });

  return {
    success: true,
    message: 'Organization logo deleted successfully',
  };
}
