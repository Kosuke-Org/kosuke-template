'use client';

import { ExternalLink } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser } from '@stackframe/stack';

export default function NotificationsPage() {
  const user = useUser({ or: 'redirect' });

  const handleManageNotifications = () => {
    // Redirect to Stack's account settings for notification preferences
    window.location.href = '/handler/account-settings';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Manage your notification settings and email preferences.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Current User</h3>
              <p className="text-base">{user?.primaryEmail}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Notification Management</h3>
              <p className="text-sm text-muted-foreground">
                Notification preferences are managed through your account settings.
              </p>
            </div>
          </div>

          <Button onClick={handleManageNotifications} className="w-full sm:w-auto">
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage Notification Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
