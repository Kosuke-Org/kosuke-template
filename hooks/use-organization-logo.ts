/**
 * Organization Logo Hook
 * Hook for uploading and deleting organization logos
 */

'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64 } from '@/lib/utils';

interface UploadLogoOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useOrganizationLogo(organizationId: string) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = trpc.organizations.uploadOrganizationLogo.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization logo updated successfully',
      });
      utils.organizations.getUserOrganizations.invalidate();
      utils.organizations.getOrganization.invalidate({ organizationId });
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });

  const deleteMutation = trpc.organizations.deleteOrganizationLogo.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization logo removed successfully',
      });
      utils.organizations.getUserOrganizations.invalidate();
      utils.organizations.getOrganization.invalidate({ organizationId });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadLogo = async (file: File, options?: UploadLogoOptions) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, WebP, or SVG image',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      const base64 = await fileToBase64(file);

      uploadMutation.mutate(
        {
          organizationId,
          fileBase64: base64,
          fileName: file.name,
          mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml',
        },
        {
          onSuccess: () => {
            options?.onSuccess?.();
          },
          onError: (error) => {
            options?.onError?.(error);
          },
        }
      );
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      });
      setIsUploading(false);
    }
  };

  const deleteLogo = (options?: UploadLogoOptions) => {
    deleteMutation.mutate(
      { organizationId },
      {
        onSuccess: () => {
          options?.onSuccess?.();
        },
        onError: (error) => {
          options?.onError?.(error);
        },
      }
    );
  };

  return {
    uploadLogo,
    deleteLogo,
    isUploading,
    isDeleting: deleteMutation.isPending,
  };
}
