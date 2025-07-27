'use client';

import React from 'react';

import Footer from '@/app/(logged-out)/home/components/footer';
import Navbar from '@/app/(logged-out)/home/components/navbar';
import MobileNav from '@/app/(logged-out)/home/components/mobile-nav';

export default function LoggedOutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar variant="standard" />
      <main className="flex flex-1 flex-col w-full pt-[60px] pb-14">{children}</main>
      <MobileNav />
      <Footer />
    </div>
  );
}
