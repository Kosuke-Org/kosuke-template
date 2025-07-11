'use client';

import { ExternalLink, Shield } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@stackframe/stack';

export default function SecurityPage() {
  const user = useUser({ or: 'redirect' });

  const handleManageSecurity = () => {
    // Redirect to Stack's account settings for security management
    window.location.href = '/handler/account-settings';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Manage your password, authentication, and account security.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Current User</h3>
              <p className="text-base">{user?.primaryEmail}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Security Management</h3>
              <p className="text-sm text-muted-foreground">
                Password changes, two-factor authentication, and account deletion are managed
                through your account settings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
            <Shield className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium">Secure Account Management</p>
              <p className="text-xs text-muted-foreground">
                Your security settings are protected and managed by Stack Auth
              </p>
            </div>
          </div>

          <Button onClick={handleManageSecurity} className="w-full sm:w-auto">
            <ExternalLink className="mr-2 h-4 w-4" />
            Manage Security Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
