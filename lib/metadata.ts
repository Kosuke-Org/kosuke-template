import { Metadata } from 'next';

interface SEOConfig {
  title:
    | string
    | {
        default: string;
        template: string;
      };
  description: string;
  keywords?: string[];
  images?: Array<{
    url: string;
    width: number;
    height: number;
    alt: string;
  }>;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  section?: string;
  locale?: string;
}

export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title,
    description,
    keywords = [],
    images = [],
    type = 'website',
    publishedTime,
    modifiedTime,
    authors = [],
    section,
    locale = 'en_US',
  } = config;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';
  const titleString = typeof title === 'string' ? title : title.default;

  // Default image if none provided
  const defaultImages =
    images.length > 0
      ? images
      : [
          {
            url: `${baseUrl}/og-image.jpg`,
            width: 1200,
            height: 630,
            alt: titleString,
          },
        ];

  return {
    title: typeof title === 'string' ? title : { default: title.default, template: title.template },
    description,
    keywords: keywords.join(', '),
    authors: authors.map((author) => ({ name: author })),
    creator: 'Kosuke Template',
    publisher: 'Kosuke Template',
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: baseUrl,
    },
    openGraph: {
      title: titleString,
      description,
      url: baseUrl,
      siteName: 'Kosuke Template',
      images: defaultImages,
      locale,
      type,
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
      ...(authors.length > 0 && { authors }),
      ...(section && { section }),
    },
    twitter: {
      card: 'summary_large_image',
      title: titleString,
      description,
      images: defaultImages.map((img) => img.url),
      creator: '@kosuketemplate',
      site: '@kosuketemplate',
    },
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
      google: process.env.GOOGLE_SITE_VERIFICATION,
      yandex: process.env.YANDEX_VERIFICATION,
      yahoo: process.env.YAHOO_SITE_VERIFICATION,
    },
  };
}

export function generateJsonLd(config: {
  type: 'WebSite' | 'Organization' | 'Article' | 'BreadcrumbList';
  name?: string;
  description?: string;
  url?: string;
  image?: string;
  logo?: string;
  sameAs?: string[];
  author?: string;
  datePublished?: string;
  dateModified?: string;
  headline?: string;
  breadcrumbs?: Array<{
    name: string;
    url: string;
  }>;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';

  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': config.type,
  };

  switch (config.type) {
    case 'WebSite':
      return {
        ...baseSchema,
        name: config.name || 'Kosuke Template',
        description: config.description || 'Modern Next.js template with Clerk authentication',
        url: config.url || baseUrl,
        image: config.image || `${baseUrl}/og-image.jpg`,
        sameAs: config.sameAs || [],
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/search?q={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      };

    case 'Organization':
      return {
        ...baseSchema,
        name: config.name || 'Kosuke Template',
        description: config.description || 'Modern Next.js template with Clerk authentication',
        url: config.url || baseUrl,
        logo: config.logo || `${baseUrl}/logo.png`,
        image: config.image || `${baseUrl}/og-image.jpg`,
        sameAs: config.sameAs || [],
      };

    case 'Article':
      return {
        ...baseSchema,
        headline: config.headline || config.name,
        description: config.description,
        image: config.image || `${baseUrl}/og-image.jpg`,
        author: {
          '@type': 'Person',
          name: config.author || 'Kosuke Template',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Kosuke Template',
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/logo.png`,
          },
        },
        datePublished: config.datePublished,
        dateModified: config.dateModified || config.datePublished,
      };

    case 'BreadcrumbList':
      return {
        ...baseSchema,
        itemListElement:
          config.breadcrumbs?.map((crumb, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: crumb.name,
            item: crumb.url,
          })) || [],
      };

    default:
      return baseSchema;
  }
}
