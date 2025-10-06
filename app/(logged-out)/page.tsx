import { Home } from '@/components/home';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Production-Ready Next.js Starter',
  description:
    'Skip the boilerplate and ship features fast. Production-ready Next.js template with auth, billing, database, and deployment.',
  keywords: [
    'Next.js',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Clerk',
    'PostgreSQL',
    'Drizzle ORM',
    'Vercel',
  ],
  authors: [{ name: 'Kosuke Template' }],
  openGraph: {
    title: 'Kosuke Template - Production-Ready Next.js Starter',
    description:
      'Skip the boilerplate and ship features fast. Production-ready Next.js template with auth, billing, database, and deployment.',
    type: 'website',
    url: 'https://kosuke-template.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kosuke Template - Production-Ready Next.js Starter',
    description:
      'Skip the boilerplate and ship features fast. Production-ready Next.js template with auth, billing, database, and deployment.',
  },
};

export default function RootPage() {
  return <Home />;
}
