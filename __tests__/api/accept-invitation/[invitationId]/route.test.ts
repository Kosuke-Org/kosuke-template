import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/accept-invitation/[invitationId]/route';

// Mock auth
vi.mock('@/lib/auth/providers', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
      acceptInvitation: vi.fn(),
      setActiveOrganization: vi.fn(),
    },
  },
}));

// Mock organizations
vi.mock('@/lib/organizations', () => ({
  getOrgById: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(() => Promise.resolve({})),
}));

describe('Accept Invitation Route', () => {
  let auth: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  let getOrgById: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const mockInvitationId = 'inv_123';
  const mockOrgId = 'org_123';
  const mockOrgSlug = 'test-org';
  const mockBaseUrl = 'https://example.com';

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', mockBaseUrl);

    // Dynamically import after mocks are applied
    ({ auth } = await import('@/lib/auth/providers'));
    ({ getOrgById } = await import('@/lib/organizations'));
  });

  describe('GET /api/accept-invitation/[invitationId]', () => {
    it('should redirect to sign-in if user is not authenticated', async () => {
      auth.api.getSession.mockResolvedValue(null);

      const request = new NextRequest(`${mockBaseUrl}/api/accept-invitation/${mockInvitationId}`);
      const response = await GET(request, {
        params: Promise.resolve({ invitationId: mockInvitationId }),
      });

      expect(response.status).toBe(307); // Redirect status
      expect(response.headers.get('location')).toBe(
        `${mockBaseUrl}/sign-in?redirect=%2Fapi%2Faccept-invitation%2F${mockInvitationId}`
      );
      expect(auth.api.acceptInvitation).not.toHaveBeenCalled();
    });

    it('should accept invitation and redirect to root when authenticated', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user_123', email: 'test@example.com' },
      });
      auth.api.acceptInvitation.mockResolvedValue({
        invitation: { organizationId: null },
      });

      const request = new NextRequest(`${mockBaseUrl}/api/accept-invitation/${mockInvitationId}`);
      const response = await GET(request, {
        params: Promise.resolve({ invitationId: mockInvitationId }),
      });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(`${mockBaseUrl}/`);
      expect(auth.api.acceptInvitation).toHaveBeenCalledWith({
        body: { invitationId: mockInvitationId },
        headers: {},
      });
      expect(auth.api.setActiveOrganization).not.toHaveBeenCalled();
    });

    it('should set active organization when invitation includes organizationId', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user_123', email: 'test@example.com' },
      });
      auth.api.acceptInvitation.mockResolvedValue({
        invitation: { organizationId: mockOrgId },
      });
      getOrgById.mockResolvedValue({ id: mockOrgId, slug: mockOrgSlug });
      auth.api.setActiveOrganization.mockResolvedValue({});

      const request = new NextRequest(`${mockBaseUrl}/api/accept-invitation/${mockInvitationId}`);
      const response = await GET(request, {
        params: Promise.resolve({ invitationId: mockInvitationId }),
      });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(`${mockBaseUrl}/`);
      expect(auth.api.acceptInvitation).toHaveBeenCalledWith({
        body: { invitationId: mockInvitationId },
        headers: {},
      });
      expect(getOrgById).toHaveBeenCalledWith(mockOrgId);
      expect(auth.api.setActiveOrganization).toHaveBeenCalledWith({
        body: {
          organizationId: mockOrgId,
          organizationSlug: mockOrgSlug,
        },
        headers: {},
      });
    });

    it('should handle missing organization slug gracefully', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user_123', email: 'test@example.com' },
      });
      auth.api.acceptInvitation.mockResolvedValue({
        invitation: { organizationId: mockOrgId },
      });
      getOrgById.mockResolvedValue(null); // Organization not found
      auth.api.setActiveOrganization.mockResolvedValue({});

      const request = new NextRequest(`${mockBaseUrl}/api/accept-invitation/${mockInvitationId}`);
      const response = await GET(request, {
        params: Promise.resolve({ invitationId: mockInvitationId }),
      });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(`${mockBaseUrl}/`);
      expect(auth.api.setActiveOrganization).toHaveBeenCalledWith({
        body: {
          organizationId: mockOrgId,
          organizationSlug: undefined,
        },
        headers: {},
      });
    });

    it('should redirect to root on error', async () => {
      auth.api.getSession.mockResolvedValue({
        user: { id: 'user_123', email: 'test@example.com' },
      });
      auth.api.acceptInvitation.mockRejectedValue(new Error('Invitation not found'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const request = new NextRequest(`${mockBaseUrl}/api/accept-invitation/${mockInvitationId}`);
      const response = await GET(request, {
        params: Promise.resolve({ invitationId: mockInvitationId }),
      });

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe(`${mockBaseUrl}/`);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should use NEXT_PUBLIC_APP_URL for redirect URLs', async () => {
      const customBaseUrl = 'https://production.example.com';
      vi.stubEnv('NEXT_PUBLIC_APP_URL', customBaseUrl);

      auth.api.getSession.mockResolvedValue({
        user: { id: 'user_123', email: 'test@example.com' },
      });
      auth.api.acceptInvitation.mockResolvedValue({
        invitation: { organizationId: null },
      });

      const request = new NextRequest(`${mockBaseUrl}/api/accept-invitation/${mockInvitationId}`);
      const response = await GET(request, {
        params: Promise.resolve({ invitationId: mockInvitationId }),
      });

      expect(response.headers.get('location')).toBe(`${customBaseUrl}/`);
    });
  });
});
