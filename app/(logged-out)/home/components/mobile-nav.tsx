'use client';

import Link from 'next/link';
import { Home, User, Settings } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserAvatar } from '@/hooks/use-user-avatar';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  className?: string;
}

export default function MobileNav({ className }: MobileNavProps) {
  const { user, isSignedIn } = useUser();
  const { profileImageUrl, initials } = useUserAvatar(user);

  return (
    <nav
      className={cn('fixed bottom-0 inset-x-0 z-40 border-t bg-background md:hidden', className)}
    >
      <div className="container flex justify-around py-2">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <Home className="h-5 w-5" />
            <span className="sr-only">Home</span>
          </Button>
        </Link>
        {isSignedIn && user ? (
          <>
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">Dashboard</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Button>
            </Link>
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={profileImageUrl} alt="Profile" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Profile</span>
              </Button>
            </Link>
          </>
        ) : (
          <>
            <Link href="/sign-in">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">Sign in</span>
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
                <span className="sr-only">Sign up</span>
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
