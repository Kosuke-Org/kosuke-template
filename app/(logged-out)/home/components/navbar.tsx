'use client';

import Link from 'next/link';
import { Menu, LogOut, Settings, User, CreditCard } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
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

        {/* Mobile navigation */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-9 w-9 hover:bg-accent/50 transition-colors"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <nav className="flex flex-col gap-6 mt-6">
                {isSignedIn && user ? (
                  // Mobile navigation for logged-in users
                  <div className="flex flex-col gap-6">
                    {/* User Profile Section */}
                    <div className="flex flex-col items-center gap-3 pb-4 border-b">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={profileImageUrl} alt={displayName} />
                        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="text-center">
                        <div className="text-base font-semibold">{displayName}</div>
                        <div className="text-sm text-muted-foreground">{primaryEmail}</div>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="flex flex-col gap-1">
                      <Link href="/dashboard">
                        <Button variant="ghost" className="w-full justify-start h-12 text-base">
                          <User className="mr-3 h-5 w-5" />
                          Dashboard
                        </Button>
                      </Link>
                      <Link href="/settings">
                        <Button variant="ghost" className="w-full justify-start h-12 text-base">
                          <Settings className="mr-3 h-5 w-5" />
                          Settings
                        </Button>
                      </Link>
                      <Link href="/settings/billing">
                        <Button variant="ghost" className="w-full justify-start h-12 text-base">
                          <CreditCard className="mr-3 h-5 w-5" />
                          Billing
                        </Button>
                      </Link>
                    </div>

                    {/* Sign Out Button */}
                    <div className="pt-4 border-t">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 text-base text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                        onClick={() => handleSignOut()}
                      >
                        <LogOut className="mr-3 h-5 w-5" />
                        Log out
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Mobile navigation for logged-out users
                  <div className="flex flex-col gap-3 pt-4">
                    <Link href="/sign-in">
                      <Button variant="ghost" className="w-full h-12 text-base">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/sign-up">
                      <Button className="w-full h-12 text-base">
                        Sign up
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
