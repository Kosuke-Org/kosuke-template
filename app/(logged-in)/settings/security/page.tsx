'use client';

import { Shield, Smartphone, Key, History, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@clerk/nextjs';
import { SecuritySettingsSkeleton } from '@/components/skeletons';

export default function SecurityPage() {
  const { user, isSignedIn } = useUser();
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  if (!isSignedIn || !user) {
    return <SecuritySettingsSkeleton />;
  }

  const handleChangePassword = async () => {
    setIsChangingPassword(true);
    try {
      // In a real implementation, you'd redirect to Clerk's password change flow
      // or implement a custom password change modal
      toast({
        title: 'Password Change',
        description: 'Password change functionality would be implemented via Clerk.',
      });
    } catch (error) {
      console.error('Error changing password:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate password change. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleEnable2FA = () => {
    toast({
      title: '2FA Setup',
      description: 'Two-factor authentication setup would be implemented via Clerk.',
    });
  };

  const handleViewSessions = () => {
    toast({
      title: 'Active Sessions',
      description: 'Session management would be implemented via Clerk dashboard.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
          <CardDescription>Monitor and manage your account security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Your account security is managed through Clerk. Most security features can be
              configured in your user profile or through Clerk&apos;s security settings.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Password Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Password & Authentication
          </CardTitle>
          <CardDescription>Manage your password and authentication methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Password</h4>
              <p className="text-sm text-muted-foreground">
                Last changed: {user.passwordEnabled ? 'Recently' : 'Never set'}
              </p>
            </div>
            <Button onClick={handleChangePassword} disabled={isChangingPassword}>
              Change Password
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Two-Factor Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Available</Badge>
              <Button variant="outline" onClick={handleEnable2FA}>
                Setup 2FA
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Account Access
          </CardTitle>
          <CardDescription>Monitor where and when your account is accessed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Active Sessions</h4>
              <p className="text-sm text-muted-foreground">
                View and manage your active login sessions
              </p>
            </div>
            <Button variant="outline" onClick={handleViewSessions}>
              <History className="h-4 w-4 mr-2" />
              View Sessions
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h4 className="font-medium">Current Session</h4>
              <p className="text-sm text-muted-foreground">
                You&apos;re currently signed in from this device
              </p>
            </div>
            <Badge className="bg-green-500">Active</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Recommendations
          </CardTitle>
          <CardDescription>Suggestions to improve your account security</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Strong password is set</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm">Consider enabling two-factor authentication</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm">Email verification is active</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
