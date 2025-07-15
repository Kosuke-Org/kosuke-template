'use client';

import { Check, Loader2, Upload, Edit, X } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/lib/hooks/use-toast';
import { useUser } from '@clerk/nextjs';
import { useProfileImage, useProfileImageUrl } from '@/lib/hooks/use-profile-image';

export default function ProfileSettings() {
  const { user, isLoaded } = useUser();
  const { toast } = useToast();
  const { setCurrentImageUrl } = useProfileImage();
  const profileImageUrl = useProfileImageUrl(user?.imageUrl);

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.fullName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  if (!isLoaded || !user) {
    return <div>Loading...</div>;
  }

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user?.fullName) return 'U';
    return user.fullName
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return;

    setIsSubmitting(true);
    try {
      const names = displayName.trim().split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';

      await user.update({
        firstName,
        lastName,
      });
      setIsEditing(false);
      toast({
        title: 'Profile updated',
        description: 'Your name has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    setDisplayName(user?.fullName || '');
    setIsEditing(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    try {
      // Create FormData and upload to our API
      const formData = new FormData();
      formData.append('file', file);

      // Upload to our API endpoint
      const response = await fetch('/api/upload/profile-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }

      const data = await response.json();

      toast({
        title: 'Profile image updated',
        description: data.message || 'Your profile image has been updated successfully.',
      });

      // Update local state immediately to show the new image
      setCurrentImageUrl(data.imageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
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
                  <Image src={profileImageUrl} alt="Profile" fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <span className="text-2xl font-medium text-muted-foreground">
                      {getInitials()}
                    </span>
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
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSaveProfile}
                        disabled={isSubmitting || !displayName.trim()}
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
                      <p className="text-base flex-1">{user?.fullName || 'Not set'}</p>
                      <Button
                        onClick={() => {
                          setDisplayName(user?.fullName || '');
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
                  <p className="text-base">{user?.primaryEmailAddress?.emailAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
