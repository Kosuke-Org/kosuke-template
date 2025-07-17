'use client';

import { Check, Loader2, Upload, Edit, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@clerk/nextjs';
import { useUserAvatar } from '@/hooks/use-user-avatar';
import { useProfileUpload } from '@/hooks/use-profile-upload';
import { useFormSubmission } from '@/hooks/use-form-submission';
import { ProfileSettingsSkeleton } from '@/components/skeletons';

export default function ProfileSettings() {
  const { user, isSignedIn } = useUser();
  const { profileImageUrl, initials, displayName, primaryEmail } = useUserAvatar(user);
  const { handleImageUpload, isUploading } = useProfileUpload();
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(displayName);

  const { handleSubmit: submitProfileUpdate, isSubmitting } = useFormSubmission({
    onSubmit: async () => {
      // Note: Clerk handles name updates differently
      // You might need to use clerkClient.users.updateUser() in an API route
      // For now, we'll show a message about this limitation
      throw new Error('Name updates need to be implemented via Clerk API routes.');
    },
    onSuccess: () => {
      setIsEditing(false);
    },
    errorMessage: 'Failed to update profile. Please try again.',
  });

  if (!isSignedIn || !user) {
    return <ProfileSettingsSkeleton />;
  }

  const handleSaveProfile = () => {
    if (!editDisplayName.trim()) return;
    submitProfileUpdate({ displayName: editDisplayName });
  };

  const handleCancelEdit = () => {
    setEditDisplayName(displayName);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Manage your account settings and profile information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-32 w-32 rounded-lg overflow-hidden border border-border bg-muted">
                {profileImageUrl ? (
                  <Image
                    src={profileImageUrl}
                    alt="Profile"
                    fill
                    className="object-cover"
                    unoptimized={profileImageUrl.includes('localhost')}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <span className="text-2xl font-medium text-muted-foreground">{initials}</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <Button variant="outline" className="flex gap-2" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Change Image
                    </>
                  )}
                </Button>
                {!isUploading && (
                  <Input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                )}
              </div>
            </div>

            {/* Profile Information */}
            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="displayName"
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Display Name
                  </Label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <Input
                        id="displayName"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSubmitting || !editDisplayName.trim()}
                        size="sm"
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </Button>
                      <Button onClick={handleCancelEdit} variant="outline" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="text-base flex-1">{displayName}</p>
                      <Button
                        onClick={() => {
                          setEditDisplayName(displayName);
                          setIsEditing(true);
                        }}
                        variant="outline"
                        size="sm"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p className="text-base">{primaryEmail}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
