import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { vi, type Mock } from 'vitest';
import { useOrgInvitation } from '@/hooks/use-org-invitation';
import { trpc } from '@/lib/trpc/client';

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
      inviteMember: {
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
      cancelInvitation: {
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
      getOrganization: {
        invalidate: vi.fn(),
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

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should call toast and invalidate queries on successful invite', async () => {
    (trpc.organizations.inviteMember.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.inviteMember.useMutation as Mock).mock.calls[0][0];
        options.onSuccess({ message: 'Member invited successfully' });
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgInvitation(), { wrapper });

    result.current.inviteMember({ organizationId: 'org_123', email: 'test@example.com' });

    expect(mockInvalidate).toHaveBeenCalled();

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Member invited successfully',
    });
  });

  it('should show destructive toast on inviteMember error', () => {
    (trpc.organizations.inviteMember.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.inviteMember.useMutation as Mock).mock.calls[0][0];
        options.onError(new Error('Invitation failed'));
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgInvitation(), { wrapper });

    result.current.inviteMember({ organizationId: 'org_123', email: 'fail@example.com' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Invitation failed',
      variant: 'destructive',
    });
  });

  it('should call toast and invalidate queries on successful cancelInvitation', () => {
    (trpc.organizations.cancelInvitation.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.cancelInvitation.useMutation as Mock).mock.calls[0][0];
        options.onSuccess({ message: 'Invitation cancelled successfully' });
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgInvitation(), { wrapper });

    result.current.cancelInvitation({ invitationId: 'inv123' });

    expect(mockInvalidate).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Invitation cancelled successfully',
    });
  });

  it('should show destructive toast on cancelInvitation error', () => {
    (trpc.organizations.cancelInvitation.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.cancelInvitation.useMutation as Mock).mock.calls[0][0];
        options.onError(new Error('Cancel failed'));
      },
      isPending: false,
    });

    const { result } = renderHook(() => useOrgInvitation(), { wrapper });

    result.current.cancelInvitation({ invitationId: 'inv999' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Cancel failed',
      variant: 'destructive',
    });
  });
});
