import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { ClerkThemeProvider } from '@/components/clerk-theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { generateMetadata, generateJsonLd } from '@/lib/metadata';
import { JsonLd } from '@/components/json-ld';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = generateMetadata({
  title: {
    default: 'Kosuke Template - Modern Next.js Template',
    template: '%s | Kosuke Template',
  },
  description:
    'A modern, production-ready Next.js template with Clerk authentication, Tailwind CSS, shadcn/ui components, Drizzle ORM, and comprehensive SEO optimization.',
  keywords: [
    'Next.js',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Clerk Auth',
    'shadcn/ui',
    'Drizzle ORM',
    'Template',
    'SEO',
    'Modern Web Development',
  ],
  authors: ['Kosuke Template Team'],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate structured data for the website
  const websiteSchema = generateJsonLd({
    type: 'WebSite',
    name: 'Kosuke Template',
    description:
      'A modern, production-ready Next.js template with comprehensive features and SEO optimization.',
    sameAs: [
      // Add your social media URLs here
      // 'https://twitter.com/kosuketemplate',
      // 'https://github.com/filopedraz/kosuke-template',
    ],
  });

  const organizationSchema = generateJsonLd({
    type: 'Organization',
    name: 'Kosuke Template',
    description: 'Creators of modern web development templates and tools.',
    sameAs: [
      // Add your organization social media URLs here
    ],
  });

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <JsonLd data={websiteSchema} />
        <JsonLd data={organizationSchema} />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ClerkThemeProvider>
            {children}
            <Toaster />
          </ClerkThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
