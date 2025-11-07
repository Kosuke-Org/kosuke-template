/**
 * Organization Logo Hook
 * Hook for uploading and deleting organization logos
 */

'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64 } from '@/lib/utils';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

export function useOrganizationLogo() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const uploadMutation = trpc.organizations.uploadOrganizationLogo.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization logo updated successfully',
      });
      utils.organizations.getUserOrganizations.invalidate();
      utils.organizations.getOrganization.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = trpc.organizations.deleteOrganizationLogo.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization logo removed successfully',
      });
      utils.organizations.getUserOrganizations.invalidate();
      utils.organizations.getOrganization.invalidate();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const validateLogoFile = (file: File): boolean => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return false;
    }

    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, WebP, or SVG image',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const uploadLogo = async (file: File) => {
    if (!validateLogoFile(file)) return;

    const base64 = await fileToBase64(file);

    await uploadMutation.mutateAsync({
      fileBase64: base64,
      fileName: file.name,
      mimeType: file.type as (typeof validTypes)[number] as
        | 'image/jpeg'
        | 'image/png'
        | 'image/webp'
        | 'image/svg+xml',
    });
  };

  return {
    uploadLogo,
    deleteLogo: () => deleteMutation.mutate(),
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
