'use client';

import Link from 'next/link';
import { LogOut, Settings, User, CreditCard } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUserAvatar } from '@/hooks/use-user-avatar';
import { useAuthActions } from '@/hooks/use-auth-actions';

interface NavbarProps {
  variant?: 'standard' | 'transparent';
  className?: string;
}

export default function Navbar({ variant = 'standard', className }: NavbarProps) {
  const { user, isSignedIn } = useUser();
  const { profileImageUrl, initials, displayName, primaryEmail } = useUserAvatar(user);
  const { handleSignOut } = useAuthActions();

  return (
    <header
      className={cn(
        'fixed top-0 w-full z-50 py-3',
        variant === 'standard' ? 'bg-background border-b' : 'bg-transparent',
        className
      )}
    >
      <div className="container flex h-10 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl font-bold">Kosuke</span>
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {isSignedIn && user ? (
            // Show user profile for logged-in users
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-transparent">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profileImageUrl} alt={displayName} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{primaryEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/dashboard" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings/billing" className="cursor-pointer">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Billing
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleSignOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            // Show login/signup for logged-out users
            <div className="flex items-center gap-3">
              <Link href="/sign-in">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link href="/sign-up">
                <Button>Sign up</Button>
              </Link>
            </div>
          )}
          <ThemeToggle />
        </nav>

        {/* Mobile actions */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
