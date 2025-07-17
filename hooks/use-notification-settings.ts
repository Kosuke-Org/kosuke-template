'use client';

import { useState, useEffect } from 'react';
import { useFormSubmission } from '@/hooks/use-form-submission';

interface NotificationSettings {
  emailNotifications: boolean;
  marketingEmails: boolean;
  securityAlerts: boolean;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    marketingEmails: false,
    securityAlerts: true,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('notification-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }, []);

  const { handleSubmit: submitSettings, isSubmitting } = useFormSubmission<NotificationSettings>({
    onSubmit: async (data) => {
      // Simulate API call - in real implementation, you'd save to your backend
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Save to localStorage for persistence
      localStorage.setItem('notification-settings', JSON.stringify(data));
    },
    successMessage: 'Your notification preferences have been updated.',
    errorMessage: 'Failed to save preferences. Please try again.',
  });

  const updateSetting = (key: keyof NotificationSettings, value: boolean) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const saveSettings = () => {
    submitSettings(settings);
  };

  // Check if settings have changed (for showing save button)
  const hasUnsavedChanges = () => {
    try {
      const saved = localStorage.getItem('notification-settings');
      if (!saved) return true;
      const parsed = JSON.parse(saved);
      return JSON.stringify(settings) !== JSON.stringify(parsed);
    } catch {
      return true;
    }
  };

  return {
    settings,
    updateSetting,
    saveSettings,
    isSubmitting,
    hasUnsavedChanges: hasUnsavedChanges(),
  };
}
