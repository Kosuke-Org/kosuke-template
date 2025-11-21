'use client';

import { trpc } from '@/lib/trpc/client';
import { fileToBase64 } from '@/lib/utils';

import { useProfileImage } from '@/hooks/use-profile-image';
import { useToast } from '@/hooks/use-toast';

export function useProfileUpload() {
  const { toast } = useToast();
  const { setCurrentImageUrl } = useProfileImage();
  const utils = trpc.useUtils();

  const uploadMutation = trpc.user.uploadProfileImage.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Success',
        description: 'Profile image updated successfully',
      });

      // Update local state immediately to show the new image
      setCurrentImageUrl(data.imageUrl);

      utils.user.getUser.invalidate();
    },
    onError: (error) => {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = trpc.user.deleteProfileImage.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Profile image removed successfully',
      });

      // Clear local state
      setCurrentImageUrl(null);

      utils.user.getUser.invalidate();
    },
    onError: (error) => {
      console.error('Error deleting image:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete image. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Basic file validation
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please select an image smaller than 5MB.',
        variant: 'destructive',
      });
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, or WebP image.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Convert file to base64
      const fileBase64 = await fileToBase64(file);

      // Upload via tRPC
      await uploadMutation.mutateAsync({
        fileBase64,
        fileName: file.name,
        mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
      });
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  const handleImageDelete = () => {
    deleteMutation.mutate();
  };

  return {
    handleImageUpload,
    handleImageDelete,
    isUploading: uploadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error: uploadMutation.error || deleteMutation.error,
  };
}
