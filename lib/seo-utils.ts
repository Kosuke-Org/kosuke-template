import { generateJsonLd } from './metadata';

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function generateBreadcrumbs(items: BreadcrumbItem[]) {
  return generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: items,
  });
}

export function getCanonicalUrl(path: string = '') {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';
  return `${baseUrl}${path}`;
}

export function generatePageMetadata({
  title,
  description,
  path,
  keywords = [],
  type = 'website',
  images = [],
  noIndex = false,
}: {
  title: string;
  description: string;
  path?: string;
  keywords?: string[];
  type?: 'website' | 'article';
  images?: Array<{
    url: string;
    width: number;
    height: number;
    alt: string;
  }>;
  noIndex?: boolean;
}) {
  const canonical = getCanonicalUrl(path);

  return {
    title,
    description,
    keywords: keywords.join(', '),
    canonical,
    openGraph: {
      title,
      description,
      url: canonical,
      type,
      images,
    },
    twitter: {
      title,
      description,
      images: images.map((img) => img.url),
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
  };
}

export const DEFAULT_SEO_CONFIG = {
  siteName: 'Kosuke Template',
  siteDescription:
    'A modern, production-ready Next.js template with Clerk authentication, Tailwind CSS, shadcn/ui components, Drizzle ORM, and comprehensive SEO optimization.',
  defaultKeywords: [
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
  social: {
    twitter: '@kosuketemplate',
    github: 'https://github.com/filopedraz/kosuke-template',
  },
  author: 'Kosuke Template Team',
};
