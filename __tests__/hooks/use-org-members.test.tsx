import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi, type Mock } from 'vitest';
import { useOrgMembers } from '@/hooks/use-org-members';
import { trpc } from '@/lib/trpc/client';
import { AUTH_ROUTES } from '@/lib/auth/constants';

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockInvalidate = vi.fn();
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    organizations: {
      updateMemberRole: {
        useMutation: vi.fn(
          (_: {
            onSuccess?: (data: { message: string }) => void;
            onError?: (error: { message: string }) => void;
          }) => ({
            mutate: vi.fn(),
            isPending: false,
          })
        ),
      },
      leaveOrganization: {
        useMutation: vi.fn(
          (_: {
            onSuccess?: (data: { message: string }) => void;
            onError?: (error: { message: string }) => void;
          }) => ({
            mutate: vi.fn(),
            isPending: false,
          })
        ),
      },
      removeMember: {
        useMutation: vi.fn(
          (_: {
            onSuccess?: (data: { message: string }) => void;
            onError?: (error: { message: string }) => void;
          }) => ({
            mutate: vi.fn(),
            isPending: false,
          })
        ),
      },
    },
    useUtils: () => ({
      organizations: {
        getOrganization: {
          invalidate: mockInvalidate,
        },
      },
    }),
  },
}));

describe('useOrgInvitation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset global location.search
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = {
      search: '',
    };

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should call toast and invalidate queries on successful removeMember', () => {
    (trpc.organizations.removeMember.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.removeMember.useMutation as Mock).mock.calls[0][0];
        options.onSuccess({ message: 'Member removed successfully' });
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgMembers(), { wrapper });

    result.current.removeMember({ organizationId: 'org_123', memberIdOrEmail: 'member_123' });

    expect(mockInvalidate).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Member removed successfully',
    });
  });

  it('should show destructive toast on removeMember error', () => {
    (trpc.organizations.removeMember.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.removeMember.useMutation as Mock).mock.calls[0][0];
        options.onError(new Error('Remove failed'));
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgMembers(), { wrapper });

    result.current.removeMember({ organizationId: 'org_123', memberIdOrEmail: 'member_123' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Remove failed',
      variant: 'destructive',
    });
  });

  it('should call toast and invalidate queries on successful updateMemberRole', async () => {
    (trpc.organizations.updateMemberRole.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.updateMemberRole.useMutation as Mock).mock.calls[0][0];
        options.onSuccess({ message: 'Member role updated successfully' });
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgMembers(), { wrapper });

    result.current.updateMemberRole({
      organizationId: 'org_123',
      memberId: 'member_123',
      role: 'admin',
    });

    expect(mockInvalidate).toHaveBeenCalled();

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Member role updated successfully',
    });
  });

  it('should show destructive toast on updateMemberRole error', () => {
    (trpc.organizations.updateMemberRole.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.updateMemberRole.useMutation as Mock).mock.calls[0][0];
        options.onError(new Error('Member role update failed'));
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgMembers(), { wrapper });

    result.current.updateMemberRole({
      organizationId: 'org_123',
      memberId: 'member_123',
      role: 'admin',
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Member role update failed',
      variant: 'destructive',
    });
  });

  it('should call toast and invalidate queries on successful leaveOrganization', () => {
    vi.useFakeTimers();

    (trpc.organizations.leaveOrganization.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.leaveOrganization.useMutation as Mock).mock.calls[0][0];
        options.onSuccess({ message: 'You have left the organization' });
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgMembers(), { wrapper });

    result.current.leaveOrganization({ organizationId: 'org_123' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'You have left the organization',
    });

    vi.advanceTimersByTime(500);
    expect(window.location.href).toBe(AUTH_ROUTES.ROOT);
  });

  it('should show destructive toast on leaveOrganization error', () => {
    (trpc.organizations.leaveOrganization.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.leaveOrganization.useMutation as Mock).mock.calls[0][0];
        options.onError(new Error('Cancel failed'));
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgMembers(), { wrapper });

    result.current.leaveOrganization({ organizationId: 'org_123' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Cancel failed',
      variant: 'destructive',
    });
  });
});
