import { beforeEach, describe, expect, it, vi } from 'vitest';

import { switchToNextOrganization } from '@/lib/organizations/utils';

vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      listOrganizations: vi.fn(),
      setActiveOrganization: vi.fn(),
    },
  },
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve({})),
}));

describe('switchToNextOrganization', () => {
  let auth: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const mockHeaders = {};

  beforeEach(async () => {
    vi.clearAllMocks();

    // Dynamically import after mocks are applied
    ({ auth } = await import('@/lib/auth/providers'));
  });

  it('should switch to the first available organization when user has other organizations', async () => {
    const userId = 'user_123';
    const mockOrgs = [
      { id: 'org_1', slug: 'org-1', name: 'Organization 1' },
      { id: 'org_2', slug: 'org-2', name: 'Organization 2' },
    ];

    auth.api.listOrganizations.mockResolvedValue(mockOrgs);
    auth.api.setActiveOrganization.mockResolvedValue({});

    await switchToNextOrganization(userId);

    expect(auth.api.listOrganizations).toHaveBeenCalledWith({
      query: { userId },
      headers: mockHeaders,
    });

    expect(auth.api.setActiveOrganization).toHaveBeenCalledWith({
      body: {
        organizationId: 'org_1',
        organizationSlug: 'org-1',
      },
      headers: mockHeaders,
    });
  });

  it('should set active organization to null when user has no other organizations', async () => {
    const userId = 'user_123';

    auth.api.listOrganizations.mockResolvedValue([]);
    auth.api.setActiveOrganization.mockResolvedValue({});

    await switchToNextOrganization(userId);

    expect(auth.api.listOrganizations).toHaveBeenCalledWith({
      query: { userId },
      headers: mockHeaders,
    });

    expect(auth.api.setActiveOrganization).toHaveBeenCalledWith({
      body: {
        organizationId: null,
      },
      headers: mockHeaders,
    });
  });

  it('should handle single organization correctly', async () => {
    const userId = 'user_123';
    const mockOrgs = [{ id: 'org_1', slug: 'org-1', name: 'Organization 1' }];

    auth.api.listOrganizations.mockResolvedValue(mockOrgs);
    auth.api.setActiveOrganization.mockResolvedValue({});

    await switchToNextOrganization(userId);

    expect(auth.api.setActiveOrganization).toHaveBeenCalledWith({
      body: {
        organizationId: 'org_1',
        organizationSlug: 'org-1',
      },
      headers: mockHeaders,
    });
  });
});
