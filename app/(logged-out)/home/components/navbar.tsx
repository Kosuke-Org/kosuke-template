'use client';

import { useTheme } from 'next-themes';
import Image from 'next/image';
import Link from 'next/link';

import { CreditCard, LogOut, Menu, Settings, Shield, User } from 'lucide-react';

import { cn } from '@/lib/utils';

import { useAuth } from '@/hooks/use-auth';
import { useAuthActions } from '@/hooks/use-auth';
import { useOrganization } from '@/hooks/use-organization';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserAvatar } from '@/hooks/use-user-avatar';

import { ThemeToggle } from '@/components/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface NavbarProps {
  variant?: 'standard' | 'transparent';
  className?: string;
}

export default function Navbar({ variant = 'standard', className }: NavbarProps) {
  const { isSignedIn } = useAuth();
  const { profileImageUrl, initials, displayName, primaryEmail } = useUserAvatar();
  const { signOut: handleSignOut } = useAuthActions();
  const { isAdmin } = usePermissions();
  const { theme } = useTheme();
  const { organization: activeOrganization } = useOrganization();
  const dashboardUrl = activeOrganization ? `/org/${activeOrganization.slug}/dashboard` : '/';
  const settingsUrl = '/settings';
  const billingUrl = '/settings/billing';
  const adminUrl = '/admin';

  return (
    <header
      className={cn(
        'fixed top-0 z-50 w-full py-3',
        variant === 'standard' ? 'bg-background border-b' : 'bg-transparent',
        className
      )}
    >
      <div className="container flex h-10 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Image
            src={theme === 'dark' ? '/logos/logo-dark.svg' : '/logos/logo.svg'}
            alt="Kosuke Template"
            width={160}
            height={28}
          />
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          {isSignedIn ? (
            // Show user profile for logged-in users
            <div className="flex items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="cursor-pointer">
                    <Avatar className="h-8 w-8 rounded-lg">
                      {profileImageUrl && <AvatarImage src={profileImageUrl} alt={displayName} />}
                      <AvatarFallback className="bg-primary text-primary-foreground rounded-lg">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm leading-none font-medium">{displayName}</p>
                      <p className="text-muted-foreground text-xs leading-none">{primaryEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href={dashboardUrl} className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link href={adminUrl} className="cursor-pointer">
                          <Shield className="mr-2 h-4 w-4" />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem asChild>
                      <Link href={settingsUrl} className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={billingUrl} className="cursor-pointer">
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
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetTitle className="sr-only">Sidebar</SheetTitle>
              <nav className="mt-10 flex flex-col gap-4 px-4">
                {isSignedIn ? (
                  // Mobile navigation for logged-in users
                  <>
                    <div className="flex items-center gap-3 rounded-lg">
                      <Avatar className="h-8 w-8 rounded-lg">
                        {profileImageUrl && <AvatarImage src={profileImageUrl} alt={displayName} />}
                        <AvatarFallback className="bg-primary text-primary-foreground rounded-lg">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{displayName}</div>
                        <div className="text-muted-foreground text-xs">{primaryEmail}</div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Link href={dashboardUrl}>
                        <Button variant="ghost" className="w-full justify-start">
                          <User className="mr-2 h-4 w-4" />
                          Dashboard
                        </Button>
                      </Link>
                      {isAdmin && (
                        <Link href={adminUrl}>
                          <Button variant="ghost" className="w-full justify-start">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin
                          </Button>
                        </Link>
                      )}
                      <Link href={settingsUrl}>
                        <Button variant="ghost" className="w-full justify-start">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Button>
                      </Link>
                      <Link href={billingUrl}>
                        <Button variant="ghost" className="w-full justify-start">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Billing
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                        onClick={() => handleSignOut()}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Log out
                      </Button>
                    </div>
                  </>
                ) : (
                  // Mobile navigation for logged-out users
                  <>
                    <Link href="/sign-in">
                      <Button variant="ghost" className="w-full justify-start">
                        Log in
                      </Button>
                    </Link>
                    <Link href="/sign-up">
                      <Button className="w-full">Sign up</Button>
                    </Link>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
