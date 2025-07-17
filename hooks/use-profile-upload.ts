'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useProfileImage } from '@/hooks/use-profile-image';

interface UploadResponse {
  success: boolean;
  imageUrl: string;
  message?: string;
  error?: string;
}

export function useProfileUpload() {
  const { toast } = useToast();
  const { setCurrentImageUrl } = useProfileImage();
  const [isUploading, setIsUploading] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File): Promise<UploadResponse> => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      return response.json();
    },
    onMutate: () => {
      setIsUploading(true);
    },
    onSuccess: (data) => {
      toast({
        title: 'Profile image updated',
        description: data.message || 'Your profile image has been updated successfully.',
      });

      // Update local state immediately to show the new image
      setCurrentImageUrl(data.imageUrl);
    },
    onError: (error) => {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a valid image file.',
        variant: 'destructive',
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  return {
    handleImageUpload,
    isUploading: isUploading || uploadMutation.isPending,
    error: uploadMutation.error,
  };
}
