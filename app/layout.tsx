import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { ClerkThemeProvider } from '@/components/clerk-theme-provider';
import { Providers } from '@/components/providers';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://template.kosuke.ai/'),
  title: {
    template: '%s | Kosuke Template',
    default: 'Kosuke Template',
  },
  description:
    'Production-ready Next.js template with auth, billing, database, and deployment. Skip the boilerplate and ship features fast.',
  keywords: [
    'Next.js',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'Clerk',
    'PostgreSQL',
    'Drizzle ORM',
    'Vercel',
    'Starter Template',
    'Boilerplate',
  ],
  authors: [{ name: 'Kosuke Template' }],
  creator: 'Kosuke Template',
  publisher: 'Kosuke Template',
  openGraph: {
    title: 'Kosuke Template - Production-Ready Next.js Starter',
    description:
      'Production-ready Next.js template with auth, billing, database, and deployment. Skip the boilerplate and ship features fast.',
    type: 'website',
    images: ['/opengraph-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kosuke Template - Production-Ready Next.js Starter',
    description:
      'Production-ready Next.js template with auth, billing, database, and deployment. Skip the boilerplate and ship features fast.',
    images: ['/opengraph-image.png'],
  },
  icons: [
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '96x96',
      url: '/favicon-96x96.png',
    },
    {
      rel: 'icon',
      type: 'image/svg+xml',
      url: '/favicon.svg',
    },
    {
      rel: 'shortcut icon',
      url: '/favicon.ico',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      url: '/apple-touch-icon.png',
    },
  ],
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // Add when you have these set up:
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
    // bing: 'your-bing-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  const plausibleHost = process.env.NEXT_PUBLIC_PLAUSIBLE_HOST;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {plausibleDomain && plausibleHost && (
          <Script
            defer
            data-domain={plausibleDomain}
            src={`${plausibleHost}/js/script.js`}
            strategy="afterInteractive"
          />
        )}
        <ClerkThemeProvider>
          <Providers>{children}</Providers>
        </ClerkThemeProvider>
      </body>
    </html>
  );
}
