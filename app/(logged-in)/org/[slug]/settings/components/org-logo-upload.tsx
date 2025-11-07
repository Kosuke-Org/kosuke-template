/**
 * Organization Logo Upload Component
 * Upload and manage organization logo
 */

'use client';

import { useRef } from 'react';
import { Upload, Loader2, X } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { getInitials } from '@/lib/utils';
import { useOrganizationLogo } from '@/hooks/use-organization-logo';
import type { FullOrganizationResponse as Organization } from '@/lib/types/organization';

export function OrgLogoUpload({ organization }: { organization: Organization }) {
  const { uploadLogo, deleteLogo: handleDelete, isUploading, isDeleting } = useOrganizationLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadLogo(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!organization) return null;

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
            {organization.logo && <AvatarImage src={organization.logo} alt={organization.name} />}
            <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-2xl">
              {orgInitials}
            </AvatarFallback>
          </Avatar>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isDeleting}
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

            {organization.logo && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isUploading || isDeleting}
              >
                {isDeleting ? (
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
