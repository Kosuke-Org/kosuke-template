'use client';

import { ExternalLink } from 'lucide-react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUser } from '@stackframe/stack';

export default function ProfileSettings() {
  const user = useUser({ or: 'redirect' });

  // Get initials for avatar fallback
  const getInitials = () => {
    if (!user?.displayName) return 'U';
    return user.displayName
      .split(' ')
      .map((part: string) => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleManageProfile = () => {
    // Redirect to Stack's profile management
    window.location.href = '/handler/account-settings';
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
                {user?.profileImageUrl ? (
                  <Image src={user.profileImageUrl} alt="Profile" fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <span className="text-2xl font-medium text-muted-foreground">
                      {getInitials()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Profile Information */}
            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Name</h3>
                  <p className="text-base">{user?.displayName || 'Not set'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Email</h3>
                  <p className="text-base">{user?.primaryEmail}</p>
                </div>
              </div>

              <Button onClick={handleManageProfile} className="w-full sm:w-auto">
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage Profile Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
