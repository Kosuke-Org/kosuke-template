'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import type { NotificationSettings } from '@/lib/types';

export function useNotificationSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Default settings
  const defaultSettings: NotificationSettings = {
    emailNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
  };

  // Query to fetch current settings
  const settingsQuery = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async (): Promise<NotificationSettings> => {
      const response = await fetch('/api/user/notification-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch notification settings');
      }
      const data = await response.json();
      return data.data || defaultSettings;
    },
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mutation to update settings
  const updateMutation = useMutation({
    mutationFn: async (newSettings: NotificationSettings): Promise<NotificationSettings> => {
      const response = await fetch('/api/user/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      const data = await response.json();
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast({
        title: 'Settings updated',
        description: 'Your notification preferences have been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const currentSettings = settingsQuery.data || defaultSettings;
    const newSettings = {
      ...currentSettings,
      [key]: value,
    };
    updateMutation.mutate(newSettings);
  };

  const updateSettings = (newSettings: NotificationSettings) => {
    updateMutation.mutate(newSettings);
  };

  return {
    settings: settingsQuery.data || defaultSettings,
    isLoading: settingsQuery.isLoading,
    isUpdating: updateMutation.isPending,
    error: settingsQuery.error || updateMutation.error,
    updateSetting,
    updateSettings,
    refetch: settingsQuery.refetch,
  };
}
