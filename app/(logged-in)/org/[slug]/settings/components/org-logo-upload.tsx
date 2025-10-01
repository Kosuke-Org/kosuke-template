/**
 * Organization Logo Upload Component
 * Upload and manage organization logo
 */

'use client';

import { useState, useRef } from 'react';
import { Upload, Loader2, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { fileToBase64, getInitials } from '@/lib/utils';
import type { Organization } from '@/hooks/use-organizations';

interface OrgLogoUploadProps {
  organization: Organization;
}

export function OrgLogoUpload({ organization }: OrgLogoUploadProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadLogo = trpc.organizations.uploadOrganizationLogo.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization logo updated successfully',
      });
      utils.organizations.getUserOrganizations.invalidate();
      utils.organizations.getOrganization.invalidate({ organizationId: organization.id });
      setIsUploading(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setIsUploading(false);
    },
  });

  const deleteLogo = trpc.organizations.deleteOrganizationLogo.useMutation({
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Organization logo removed successfully',
      });
      utils.organizations.getUserOrganizations.invalidate();
      utils.organizations.getOrganization.invalidate({ organizationId: organization.id });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, WebP, or SVG image',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      const base64 = await fileToBase64(file);

      uploadLogo.mutate({
        organizationId: organization.id,
        fileBase64: base64,
        fileName: file.name,
        mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/svg+xml',
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload logo',
        variant: 'destructive',
      });
      setIsUploading(false);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = () => {
    if (!organization.logoUrl) return;

    deleteLogo.mutate({
      organizationId: organization.id,
    });
  };

  const orgInitials = getInitials(organization.name);

  return (
    <>
      <CardHeader>
        <CardTitle>Organization Logo</CardTitle>
        <CardDescription>Update your organization&apos;s logo image</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 rounded-lg">
            {organization.logoUrl && (
              <AvatarImage src={organization.logoUrl} alt={organization.name} />
            )}
            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-2xl">
              {orgInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || deleteLogo.isPending}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </>
              )}
            </Button>

            {organization.logoUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isUploading || deleteLogo.isPending}
              >
                {deleteLogo.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Remove
                  </>
                )}
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Recommended: Square image, at least 256x256px. Max size: 2MB. Formats: JPEG, PNG, WebP,
          SVG.
        </p>
      </CardContent>
    </>
  );
}
