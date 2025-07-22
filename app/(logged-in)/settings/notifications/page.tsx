'use client';

import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUser } from '@clerk/nextjs';
import { useNotificationSettings } from '@/hooks/use-notification-settings';
import { NotificationsSettingsSkeleton } from '@/components/skeletons';

export default function NotificationsPage() {
  const { user, isSignedIn } = useUser();
  const { settings, updateSetting, isUpdating, isLoading } = useNotificationSettings();

  if (!isSignedIn || !user) {
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
                <div className="text-sm text-muted-foreground">
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
                <div className="text-sm text-muted-foreground">
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
                <div className="text-sm text-muted-foreground">
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
            <div className="flex justify-center pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
