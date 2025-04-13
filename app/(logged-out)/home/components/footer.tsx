'use client';

import Link from 'next/link';
import { Github } from 'lucide-react';

import { cn } from '@/lib/utils';

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  return (
    <footer className={cn('w-full mt-auto py-4 border-t', className)}>
      <div className="container flex flex-col items-center justify-between gap-4 md:flex-row">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Kosuke Template. All rights reserved.
        </p>
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
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
