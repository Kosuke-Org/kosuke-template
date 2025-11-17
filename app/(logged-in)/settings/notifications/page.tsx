'use client';

import { Loader2 } from 'lucide-react';

import { useNotificationSettings } from '@/hooks/use-notification-settings';
import { useUser } from '@/hooks/use-user';

import { ButtonSkeleton, ToggleSkeleton } from '@/components/skeletons';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

// Page-specific skeleton for notifications settings
function NotificationsSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-6 rounded-lg border p-6">
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>

        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <ToggleSkeleton key={i} />
          ))}
        </div>

        <div className="space-y-2 border-t pt-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-56" />
        </div>

        <ButtonSkeleton className="w-full sm:w-auto" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { user } = useUser();
  const { settings, updateSetting, isUpdating, isLoading } = useNotificationSettings();

  if (!user) {
    return <NotificationsSettingsSkeleton />;
  }

  if (isLoading) {
    return <NotificationsSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage how you receive notifications and updates from our platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications" className="text-base">
                  Email Notifications
                </Label>
                <div className="text-muted-foreground text-sm">
                  Receive notifications about your account activity via email
                </div>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailNotifications}
                onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing-emails" className="text-base">
                  Marketing Emails
                </Label>
                <div className="text-muted-foreground text-sm">
                  Receive emails about new features, tips, and promotional content
                </div>
              </div>
              <Switch
                id="marketing-emails"
                checked={settings.marketingEmails}
                onCheckedChange={(checked) => updateSetting('marketingEmails', checked)}
                disabled={isUpdating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="security-alerts" className="text-base">
                  Security Alerts
                </Label>
                <div className="text-muted-foreground text-sm">
                  Receive important security notifications and account alerts
                </div>
              </div>
              <Switch
                id="security-alerts"
                checked={settings.securityAlerts}
                onCheckedChange={(checked) => updateSetting('securityAlerts', checked)}
                disabled={isUpdating}
              />
            </div>
          </div>

          {isUpdating && (
            <div className="flex justify-center border-t pt-4">
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving preferences...
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
