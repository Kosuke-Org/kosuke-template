import { Home } from '@/components/home';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL,
  },
};

export default function HomePage() {
  return <Home />;
}
