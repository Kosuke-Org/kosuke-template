import { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { type Mock, vi } from 'vitest';

import { AUTH_ROUTES } from '@/lib/auth/constants';
import { trpc } from '@/lib/trpc/client';

import { useDeleteOrganization } from '@/hooks/use-delete-organization';

const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

const mockInvalidateUserOrgs = vi.fn();
const mockInvalidateOrg = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    organizations: {
      deleteOrganization: {
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
        getUserOrganizations: {
          invalidate: mockInvalidateUserOrgs,
        },
        getOrganization: {
          invalidate: mockInvalidateOrg,
        },
      },
    }),
  },
}));

describe('useDeleteOrganization', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset global location
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).location;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).location = {
      href: '',
    };

    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should call toast, invalidate queries, and redirect on successful deletion', () => {
    vi.useFakeTimers();

    (trpc.organizations.deleteOrganization.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.deleteOrganization.useMutation as Mock).mock
          .calls[0][0];
        options.onSuccess({ message: 'Organization deleted successfully' });
      },
      isPending: false,
    });

    const { result } = renderHook(() => useDeleteOrganization(), { wrapper });

    result.current.deleteOrganization({ organizationId: 'org_123' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Organization deleted successfully',
    });

    expect(mockInvalidateUserOrgs).toHaveBeenCalled();
    expect(mockInvalidateOrg).toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(window.location.href).toBe(AUTH_ROUTES.ROOT);

    vi.useRealTimers();
  });

  it('should show destructive toast on deletion error', () => {
    (trpc.organizations.deleteOrganization.useMutation as Mock).mockReturnValue({
      mutate: () => {
        const options = (trpc.organizations.deleteOrganization.useMutation as Mock).mock
          .calls[0][0];
        options.onError(new Error('Failed to delete organization'));
      },
      isPending: false,
    });

    const { result } = renderHook(() => useDeleteOrganization(), { wrapper });

    result.current.deleteOrganization({ organizationId: 'org_123' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to delete organization',
      variant: 'destructive',
    });

    expect(mockInvalidateUserOrgs).not.toHaveBeenCalled();
    expect(mockInvalidateOrg).not.toHaveBeenCalled();
  });
});
