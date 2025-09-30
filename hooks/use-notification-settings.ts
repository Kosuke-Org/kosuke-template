'use client';

import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import type { NotificationSettings } from '@/lib/types';

export function useNotificationSettings() {
  const { toast } = useToast();
  const utils = trpc.useContext();

  // Default settings
  const defaultSettings: NotificationSettings = {
    emailNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
  };

  // Query to fetch current settings
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = trpc.user.getNotificationSettings.useQuery();

  // Mutation to update settings
  const updateMutation = trpc.user.updateNotificationSettings.useMutation({
    onSuccess: () => {
      utils.user.getNotificationSettings.invalidate();
      toast({
        title: 'Settings updated',
        description: 'Your notification preferences have been updated successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating notification settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save preferences. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    const currentSettings = settings || defaultSettings;
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
    settings: settings || defaultSettings,
    isLoading,
    isUpdating: updateMutation.isPending,
    error: error || updateMutation.error,
    updateSetting,
    updateSettings,
    refetch,
  };
}
