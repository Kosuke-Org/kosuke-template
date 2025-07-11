'use client';

import { ThemeToggle } from '@/components/ui/theme-toggle';
import { motion } from 'framer-motion';
import Link from 'next/link';

export function Navbar() {
  return (
    <motion.nav
      className="w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container flex h-16 items-center justify-between px-4">
        <motion.div
          className="flex items-center space-x-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Link href="/" className="text-lg font-bold hover:text-primary transition-colors">
            Kosuke Template
          </Link>
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/features" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Features
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <ThemeToggle />
        </motion.div>
      </div>
    </motion.nav>
  );
}