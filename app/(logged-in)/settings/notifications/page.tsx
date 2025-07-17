'use client';

import { Check, Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useUser } from '@clerk/nextjs';
import { useNotificationSettings } from '@/hooks/use-notification-settings';
import { NotificationsSettingsSkeleton } from '@/components/skeletons';

export default function NotificationsPage() {
  const { user, isSignedIn } = useUser();
  const { settings, updateSetting, saveSettings, isSubmitting, hasUnsavedChanges } =
    useNotificationSettings();

  if (!isSignedIn || !user) {
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
              />
            </div>
          </div>

          {hasUnsavedChanges && (
            <div className="flex justify-end pt-4 border-t">
              <Button
                onClick={saveSettings}
                disabled={isSubmitting}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Save Preferences
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
