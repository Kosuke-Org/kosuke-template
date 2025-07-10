'use client';

import { Check, Loader2, Upload } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { userApi } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/use-toast';
import { useUserInfo } from '@/lib/hooks/use-user-info';

type FormState = {
  error?: string;
  success?: string;
} | null;

type ActionData = Record<string, unknown>;

export default function ProfileSettings() {
  const { toast } = useToast();
  const { user, loading: userLoading, refresh } = useUserInfo();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formState, setFormState] = useState<FormState>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Initialize form with user data when available
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user?.name) return 'U';
    return user.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Use the API client to update the account
      const response = await userApi.updateAccount(name, email);
      
      if (response.error) {
        setFormState({ error: response.error });
      } else {
        setFormState({ success: response.message || 'Profile updated successfully' });
        refresh(); // Refresh user data
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setFormState({ error: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload image
      handleImageUpload(file);
    }
  };

  const handleImageUpload = async (file: File) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('profileImage', file);

    try {
      // Use the API client to upload the profile image
      const response = await userApi.uploadProfileImage(formData);

      if (!response.error) {
        toast({
          title: 'Profile image updated',
          description: 'Your profile image has been successfully updated.',
        });
        refresh(); // Refresh user data
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to upload image',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload image. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
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
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update your personal information.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-32 w-32 rounded-lg overflow-hidden border border-border bg-muted">
                {previewImage || user?.imageUrl ? (
                  <Image
                    src={previewImage || user?.imageUrl || ''}
                    alt="Profile"
                    fill
                    className="object-cover"
                  />
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
                  <Input
                    type="file"
                    id="profileImage"
                    name="profileImage"
                    accept="image/*"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={handleImageChange}
                    disabled={isUploading}
                  />
                </Button>
              </div>
            </div>

            {/* Profile Information */}
            <div className="flex-1">
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your.email@example.com"
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
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
