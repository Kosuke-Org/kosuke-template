'use client';

import React from 'react';

import Footer from '@/app/(logged-out)/home/components/footer';
import Navbar from '@/app/(logged-out)/home/components/navbar';

export default function LoggedOutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar variant="standard" />
      <main className="flex w-full flex-1 flex-col px-4">{children}</main>
      <Footer />
    </div>
  );
}
