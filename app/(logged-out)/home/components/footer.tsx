'use client';

import Link from 'next/link';

import { Github } from 'lucide-react';

import { cn } from '@/lib/utils';

import { AppVersion } from '@/components/app-version';

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('mt-auto w-full border-t py-4', className)}>
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex flex-col items-center gap-1 md:flex-row md:items-baseline md:gap-2">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Kosuke Template. All rights reserved.
          </p>
          <AppVersion className="text-muted-foreground/60 text-xs" />
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="https://github.com/filopedraz/kosuke-core"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </Link>
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
