'use client';

import Link from 'next/link';
import { Menu, LogOut, Settings, User, CreditCard, X } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
import { Separator } from '@/components/ui/separator';
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
  const [isOpen, setIsOpen] = useState(false);

  const handleMenuClose = () => setIsOpen(false);

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
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="relative h-9 w-9 hover:bg-accent/50 transition-colors"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent 
              side="right" 
              className="w-full sm:w-80 p-0 border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
            >
              {/* Header */}
              <SheetHeader className="px-6 py-4 border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMenuClose}
                    className="h-8 w-8 hover:bg-accent/50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </SheetHeader>

              <div className="flex flex-col h-full">
                {isSignedIn && user ? (
                  // Mobile navigation for logged-in users
                  <>
                    {/* User Profile Section */}
                    <div className="px-6 py-6">
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/40 border border-border/50">
                        <Avatar className="h-12 w-12 ring-2 ring-background shadow-sm">
                          <AvatarImage src={profileImageUrl} alt={displayName} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">{displayName}</div>
                          <div className="text-sm text-muted-foreground truncate">{primaryEmail}</div>
                        </div>
                      </div>
                    </div>

                    <Separator className="mx-6" />

                    {/* Navigation Links */}
                    <nav className="flex-1 px-6 py-4">
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
                          Navigation
                        </div>
                        <Link href="/dashboard" onClick={handleMenuClose}>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start h-12 px-3 hover:bg-accent/70 transition-colors"
                          >
                            <User className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span className="text-base">Dashboard</span>
                          </Button>
                        </Link>
                        <Link href="/settings" onClick={handleMenuClose}>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start h-12 px-3 hover:bg-accent/70 transition-colors"
                          >
                            <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span className="text-base">Settings</span>
                          </Button>
                        </Link>
                        <Link href="/settings/billing" onClick={handleMenuClose}>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-start h-12 px-3 hover:bg-accent/70 transition-colors"
                          >
                            <CreditCard className="mr-3 h-4 w-4 text-muted-foreground" />
                            <span className="text-base">Billing</span>
                          </Button>
                        </Link>
                      </div>
                    </nav>

                    <Separator className="mx-6" />

                    {/* Footer Actions */}
                    <div className="px-6 py-4">
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-12 px-3 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => {
                          handleSignOut();
                          handleMenuClose();
                        }}
                      >
                        <LogOut className="mr-3 h-4 w-4" />
                        <span className="text-base">Log out</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  // Mobile navigation for logged-out users
                  <div className="flex flex-col gap-4 p-6">
                    <div className="text-center py-8">
                      <h3 className="font-semibold text-lg mb-2">Welcome to Kosuke</h3>
                      <p className="text-muted-foreground text-sm">
                        Sign in to access your account or create a new one
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <Link href="/sign-in" onClick={handleMenuClose}>
                        <Button 
                          variant="outline" 
                          className="w-full h-12 text-base font-medium hover:bg-accent/70 transition-colors"
                        >
                          Log in
                        </Button>
                      </Link>
                      <Link href="/sign-up" onClick={handleMenuClose}>
                        <Button 
                          className="w-full h-12 text-base font-medium shadow-sm hover:shadow-md transition-all"
                        >
                          Sign up
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
