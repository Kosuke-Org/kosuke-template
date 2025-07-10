'use client';

import { Check, Loader2, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userApi } from '@/lib/api/client';

type FormState = {
  error?: string;
  success?: string;
} | null;

type ActionData = Record<string, unknown>;

export default function SecurityPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formState, setFormState] = useState<FormState>(null);
  const [deleteFormState, setDeleteFormState] = useState<FormState>(null);

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    try {
      // Use the API client to update the password
      const response = await userApi.updatePassword(currentPassword, newPassword, confirmPassword);
      
      if (response.error) {
        setFormState({ error: response.error });
      } else {
        setFormState({ success: response.message || 'Password updated successfully' });
        // Reset form if successful
        e.currentTarget.reset();
      }
    } catch (error) {
      console.error('Error updating password:', error);
      setFormState({ error: 'Failed to update password. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccountDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsDeleting(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    try {
      // Use the API client to delete the account
      const response = await userApi.deleteAccount(password);
      
      // If we get here without a redirect, there was an error
      if (response.error) {
        setDeleteFormState({ error: response.error });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setDeleteFormState({ error: 'Failed to delete account. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Update your password to keep your account secure.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordUpdate} className="space-y-6">
            <div className="flex flex-col space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  required
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
                  Updating...
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/20">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showDeleteConfirm ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Once you delete your account, there is no going back. This action cannot be undone.
              </p>
              <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                Delete Account
              </Button>
            </div>
          ) : (
            <form onSubmit={handleAccountDelete} className="space-y-6">
              <div className="rounded-md bg-destructive/10 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-destructive">
                    Warning: This action is irreversible
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    All your data, including projects, settings, and history will be permanently
                    deleted.
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="deletePassword" className="text-destructive">
                  Enter your password to confirm
                </Label>
                <Input
                  id="deletePassword"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="border-destructive/50 focus-visible:ring-destructive"
                />
              </div>

              {deleteFormState?.error && (
                <div className="rounded-md bg-destructive/10 p-3">
                  <div className="text-sm text-destructive">{deleteFormState.error}</div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteFormState(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="destructive" disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Confirm Delete'
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
