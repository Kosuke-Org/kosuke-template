'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { userApi } from '@/lib/api/client';
import { useUserInfo } from '@/lib/hooks/use-user-info';
import { useToast } from '@/lib/hooks/use-toast';

type FormState = {
  error?: string;
  success?: string;
} | null;

export default function NotificationsPage() {
  const { user, loading: userLoading, refresh } = useUserInfo();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>(null);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Initialize switch states from user data
  useEffect(() => {
    if (user) {
      // Initialize marketing emails from user preferences
      // emailNotifications doesn't have a DB field but could be added in the future
      setMarketingEmails(user.marketingEmails === true);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use the API client to update notification preferences
      const response = await userApi.updateNotifications(marketingEmails);
      
      if (response.error) {
        setFormState({ error: response.error });
        toast({
          title: 'Error',
          description: response.error || 'Failed to update notification preferences.',
          variant: 'destructive',
        });
      } else {
        setFormState({ success: response.message || 'Notification preferences updated successfully.' });
        toast({
          title: 'Success',
          description: 'Notification preferences updated successfully.',
        });
        refresh(); // Refresh user data
      }
    } catch (error) {
      console.error('Error updating notifications:', error);
      setFormState({ error: 'Failed to update notification preferences.' });
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>Manage how you receive notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email notifications about account activity.
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="marketing-emails">Marketing Emails</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive emails about new features and promotions.
                  </p>
                </div>
                <Switch
                  id="marketing-emails"
                  checked={marketingEmails}
                  onCheckedChange={setMarketingEmails}
                />
              </div>
            </div>

            {formState?.error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <div className="text-sm text-destructive">{formState.error}</div>
              </div>
            )}

            {formState?.success && (
              <div className="rounded-md bg-green-500/10 p-3 flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <div className="text-sm text-green-500">{formState.success}</div>
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
