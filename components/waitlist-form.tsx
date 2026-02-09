'use client';

import { useState } from 'react';

import { motion } from 'framer-motion';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';

import { useWaitlist } from '@/hooks/use-waitlist';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const { joinWaitlist, isLoading, isSuccess } = useWaitlist();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return;
    }

    // Call mutation with browser metadata
    joinWaitlist({
      email: email.trim(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    });
  };

  // Show success state
  if (isSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-6 py-3 text-primary"
      >
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-semibold">Thanks for joining!</span>
      </motion.div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
      noValidate
    >
      <Input
        type="email"
        placeholder="Enter your email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={isLoading}
        required
        className="w-full sm:w-[280px]"
        aria-label="Email address"
      />
      <Button type="submit" size="lg" disabled={isLoading || !email} className="w-full sm:w-auto">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Join Waitlist
          </>
        )}
      </Button>
    </form>
  );
}
