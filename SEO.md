# SEO Implementation Guide

This template includes comprehensive SEO optimization features following modern best practices. This guide explains how to use and customize the SEO implementation.

## Features Included

### 1. Robots.txt

- **Location**: `app/robots.ts`
- **URL**: `/robots.txt`
- Automatically generated with appropriate disallow rules for private routes
- Includes sitemap reference

### 2. Sitemap

- **Location**: `app/sitemap.ts`
- **URL**: `/sitemap.xml`
- Dynamically generated with proper priorities and change frequencies
- Easily extendable for dynamic routes

### 3. Schema.org Structured Data

- **Utilities**: `lib/metadata.ts`
- **Component**: `components/json-ld.tsx`
- Supports WebSite, Organization, Article, and BreadcrumbList schemas
- Automatically injected in the root layout

### 4. Comprehensive Metadata

- **Main utility**: `lib/metadata.ts`
- **Helper utilities**: `lib/seo-utils.ts`
- Open Graph and Twitter Card support
- Configurable title templates
- Automatic image optimization

### 5. Web App Manifest

- **Location**: `app/manifest.ts`
- **URL**: `/manifest.json`
- PWA-ready configuration

## Usage Examples

### Basic Page Metadata

```typescript
// app/about/page.tsx
import { Metadata } from 'next'
import { generateMetadata } from '@/lib/metadata'

export const metadata: Metadata = generateMetadata({
  title: 'About Us',
  description: 'Learn more about our company and mission.',
  keywords: ['about', 'company', 'mission'],
})

export default function AboutPage() {
  return <div>About content</div>
}
```

### Article with Schema.org

```typescript
// app/blog/[slug]/page.tsx
import { generateJsonLd } from '@/lib/metadata'
import { JsonLd } from '@/components/json-ld'

export default function BlogPost({ params }: { params: { slug: string } }) {
  const articleSchema = generateJsonLd({
    type: 'Article',
    headline: 'How to Build Modern Web Apps',
    description: 'A comprehensive guide to modern web development.',
    author: 'John Doe',
    datePublished: '2024-01-15',
    dateModified: '2024-01-20',
  })

  return (
    <>
      <JsonLd data={articleSchema} />
      <article>
        {/* Article content */}
      </article>
    </>
  )
}
```

### Breadcrumbs

```typescript
import { generateBreadcrumbs } from '@/lib/seo-utils'
import { JsonLd } from '@/components/json-ld'

export default function ProductPage() {
  const breadcrumbSchema = generateBreadcrumbs([
    { name: 'Home', url: '/' },
    { name: 'Products', url: '/products' },
    { name: 'Laptop', url: '/products/laptop' },
  ])

  return (
    <>
      <JsonLd data={breadcrumbSchema} />
      {/* Page content */}
    </>
  )
}
```

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Required
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional - Site verification
GOOGLE_SITE_VERIFICATION=your_google_verification_code
YANDEX_VERIFICATION=your_yandex_verification_code
YAHOO_SITE_VERIFICATION=your_yahoo_verification_code
```

## Customization

### 1. Update Default Configuration

Edit `lib/seo-utils.ts` to customize default SEO settings:

```typescript
export const DEFAULT_SEO_CONFIG = {
  siteName: 'Your Site Name',
  siteDescription: 'Your site description',
  defaultKeywords: ['your', 'keywords'],
  social: {
    twitter: '@yourtwitterhandle',
    github: 'https://github.com/yourusername/yourrepo',
  },
  author: 'Your Name',
};
```

### 2. Add New Routes to Sitemap

Edit `app/sitemap.ts` to include additional static routes:

```typescript
const routes = [
  {
    url: baseUrl,
    lastModified: currentDate,
    changeFrequency: 'daily' as const,
    priority: 1,
  },
  {
    url: `${baseUrl}/about`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  },
  // Add more routes here
];
```

### 3. Update Robots.txt Rules

Edit `app/robots.ts` to modify crawling rules:

```typescript
return {
  rules: {
    userAgent: '*',
    allow: '/',
    disallow: [
      '/api/',
      '/admin/',
      // Add more restricted paths
    ],
  },
  sitemap: `${baseUrl}/sitemap.xml`,
};
```

## Best Practices

### 1. Page Titles

- Use descriptive, unique titles for each page
- Keep titles under 60 characters
- Include primary keywords near the beginning
- Use the title template for consistency

### 2. Meta Descriptions

- Write compelling descriptions that encourage clicks
- Keep descriptions between 150-160 characters
- Include target keywords naturally
- Make each description unique

### 3. Images

- Always include alt text for images
- Use descriptive filenames
- Optimize image sizes and formats
- Include Open Graph images (1200x630px recommended)

### 4. Structured Data

- Use appropriate schema types for content
- Test structured data with Google's Rich Results Test
- Keep structured data relevant and accurate
- Don't over-optimize or use irrelevant schemas

### 5. Performance

- Monitor Core Web Vitals
- Optimize images and fonts
- Use Next.js built-in optimizations
- Minimize layout shifts

## Testing

### 1. SEO Testing Tools

- [Google Search Console](https://search.google.com/search-console)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### 2. Local Testing

```bash
# Test robots.txt
curl http://localhost:3000/robots.txt

# Test sitemap
curl http://localhost:3000/sitemap.xml

# Test manifest
curl http://localhost:3000/manifest.json
```

## Dynamic SEO (Advanced)

For dynamic content like blog posts or product pages, you can generate metadata dynamically:

```typescript
// app/blog/[slug]/page.tsx
import { generateMetadata as generatePageMetadata } from '@/lib/metadata';

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Fetch your data
  const post = await getPost(params.slug);

  return generatePageMetadata({
    title: post.title,
    description: post.excerpt,
    keywords: post.tags,
    type: 'article',
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt,
    authors: [post.author.name],
  });
}
```

This implementation provides a solid foundation for SEO that can be easily extended and customized for your specific needs.
