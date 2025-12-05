import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAdminMemberships } from '@/app/admin/hooks/use-admin-memberships';

const mockToast = vi.fn();
const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

let createMutationOptions: {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
} = {};
let updateMutationOptions: {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
} = {};
let deleteMutationOptions: {
  onSuccess?: () => void;
  onError?: (error: { message: string }) => void;
} = {};

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: mockToast,
  })),
}));

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    admin: {
      memberships: {
        create: {
          useMutation: vi.fn((options) => {
            createMutationOptions = options || {};
            return {
              mutate: mockCreateMutate,
              isPending: false,
            };
          }),
        },
        update: {
          useMutation: vi.fn((options) => {
            updateMutationOptions = options || {};
            return {
              mutate: mockUpdateMutate,
              isPending: false,
            };
          }),
        },
        delete: {
          useMutation: vi.fn((options) => {
            deleteMutationOptions = options || {};
            return {
              mutate: mockDeleteMutate,
              isPending: false,
            };
          }),
        },
      },
    },
  },
}));

describe('useAdminMemberships', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should expose membership mutation functions', () => {
    const { result } = renderHook(() => useAdminMemberships());

    expect(result.current.createMembership).toBeDefined();
    expect(result.current.updateMembership).toBeDefined();
    expect(result.current.deleteMembership).toBeDefined();
    expect(result.current.isCreating).toBe(false);
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.isDeleting).toBe(false);
  });

  it('should call onMutationSuccess callback after successful create', () => {
    const { result } = renderHook(() => useAdminMemberships());

    result.current.createMembership({
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'member',
    });

    expect(mockCreateMutate).toHaveBeenCalledWith({
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'member',
    });

    createMutationOptions.onSuccess?.();

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'User added to organization successfully',
    });
  });

  it('should show success toast on update', () => {
    const { result } = renderHook(() => useAdminMemberships());

    result.current.updateMembership({
      id: 'membership-1',
      role: 'admin',
    });

    expect(mockUpdateMutate).toHaveBeenCalledWith({
      id: 'membership-1',
      role: 'admin',
    });

    updateMutationOptions.onSuccess?.();

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Member role updated successfully',
    });
  });

  it('should show success toast on delete', () => {
    const { result } = renderHook(() => useAdminMemberships());

    result.current.deleteMembership({ id: 'membership-1' });

    expect(mockDeleteMutate).toHaveBeenCalledWith({ id: 'membership-1' });

    deleteMutationOptions.onSuccess?.();

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Membership removed successfully',
    });
  });

  it('should show error toast on create failure', () => {
    const { result } = renderHook(() => useAdminMemberships());

    result.current.createMembership({
      userId: 'user-1',
      organizationId: 'org-1',
      role: 'member',
    });

    createMutationOptions.onError?.({ message: 'Failed to create membership' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to create membership',
      variant: 'destructive',
    });
  });

  it('should call onMutationSuccess even on update error', () => {
    const { result } = renderHook(() => useAdminMemberships());

    result.current.updateMembership({
      id: 'membership-1',
      role: 'admin',
    });

    updateMutationOptions.onError?.({ message: 'Update failed' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Update failed',
      variant: 'destructive',
    });
  });

  it('should show error toast on delete failure', () => {
    const { result } = renderHook(() => useAdminMemberships());

    result.current.deleteMembership({ id: 'membership-1' });

    deleteMutationOptions.onError?.({ message: 'Delete failed' });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Delete failed',
      variant: 'destructive',
    });
  });
});
