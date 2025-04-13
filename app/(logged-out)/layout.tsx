'use client';

import React from 'react';

import Footer from '@/app/(logged-out)/home/components/footer';
import Navbar from '@/app/(logged-out)/home/components/navbar';

export default function LoggedOutLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar variant="standard" />
      <main className="flex flex-1 flex-col items-center justify-center p-4 md:px-24 pb-4">
        {children}
      </main>
      <Footer />
    </div>
  );
}
