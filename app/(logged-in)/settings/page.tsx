'use client';

import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import Image from 'next/image';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Upload, X } from 'lucide-react';
import { z } from 'zod';

import { trpc } from '@/lib/trpc/client';
import { updateDisplayNameSchema } from '@/lib/trpc/schemas/user';

import { useAuth } from '@/hooks/use-auth';
import { useProfileUpload } from '@/hooks/use-profile-upload';
import { useToast } from '@/hooks/use-toast';

import { ButtonSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

type ProfileFormValues = z.infer<typeof updateDisplayNameSchema>;

// Page-specific skeleton for profile settings
function ProfileSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border p-6">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
        <Skeleton className="mt-4 h-3 w-full max-w-md" />
      </div>

      <div className="rounded-lg border p-6">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-56" />
          </div>
          <ButtonSkeleton />
        </div>
      </div>
    </div>
  );
}

export default function ProfileSettings() {
  const { userId, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string | null>(null);

  const { data: userData, isLoading: isUserLoading } = trpc.user.getUser.useQuery(
    { userId: userId! },
    {
      enabled: !!userId,
      staleTime: 1000 * 60 * 2, // 2 minutes
    }
  );

  const utils = trpc.useUtils();

  const localImageUrl = tempImageUrl ?? userData?.profileImageUrl ?? null;

  const { handleImageUpload, handleImageDelete, isUploading, isDeleting } = useProfileUpload();

  const updateDisplayNameMutation = trpc.user.updateDisplayName.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Display name updated successfully',
      });
      utils.user.getUser.invalidate({ userId: userId! });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(updateDisplayNameSchema),
    values: {
      displayName: userData?.displayName || '',
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleImageUpload(event);

    // Update local state to reflect the new image
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    setTempImageUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    await handleImageDelete();
    setTempImageUrl(null);
  };

  const onSubmit = async (data: ProfileFormValues) => {
    await updateDisplayNameMutation.mutateAsync(data);
  };

  // Generate initials from display name or email
  const getInitials = () => {
    if (userData?.displayName) {
      return userData.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return userData?.email[0].toUpperCase();
  };

  const watchedName = useWatch({
    control: form.control,
    name: 'displayName',
  });

  const hasChanges = watchedName !== userData?.displayName;
  const isUpdating = updateDisplayNameMutation.isPending;

  const isLoading = isAuthLoading || isUserLoading;

  if (isLoading || !userData || !userId) {
    return <ProfileSettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Profile Image Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Image</CardTitle>
          <CardDescription>Update your profile picture</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="border-border bg-muted relative h-20 w-20 overflow-hidden rounded-lg border">
              {localImageUrl ? (
                <Image
                  src={localImageUrl}
                  alt="Profile"
                  fill
                  className="object-cover"
                  unoptimized={localImageUrl.includes('localhost')}
                />
              ) : (
                <div className="bg-primary flex h-full w-full items-center justify-center">
                  <span className="text-primary-foreground text-xl font-medium">
                    {getInitials()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isDeleting}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload Image
                  </>
                )}
              </Button>

              {localImageUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isUploading || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Removing...
                    </>
                  ) : (
                    <>
                      <X className="h-4 w-4" />
                      Remove
                    </>
                  )}
                </Button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <p className="text-muted-foreground text-xs">
            Recommended: Square image, at least 256x256px. Max size: 5MB. Formats: JPEG, PNG, WebP.
          </p>
        </CardContent>
      </Card>

      {/* Profile Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Update your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter your display name"
                        {...field}
                        disabled={isUpdating}
                      />
                    </FormControl>
                    <FormDescription>This is your public display name</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Email</Label>
                <p className="text-sm">{userData.email}</p>
                <p className="text-muted-foreground text-xs">
                  Your email address cannot be changed
                </p>
              </div>

              <Button type="submit" disabled={isUpdating || !hasChanges}>
                {isUpdating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
