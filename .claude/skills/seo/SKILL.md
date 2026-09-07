---
name: seo
description: SEO reference for public pages - sitemap entries and priorities, robots rules, structured data (JSON-LD) components, page metadata and generateMetadata, web manifest, per-feature checklists, anti-patterns, and testing commands. Load whenever adding or changing a public page, pricing, blog, or docs route.
---

# SEO Management

**SEO is not optional.** Whenever you add a public page or change the product offering, update the SEO files below in the same change.

## 🎯 SEO Files That Must Be Updated

### 1. **Sitemap** (`app/sitemap.ts`) - ALWAYS UPDATE

**When to update:**

- Adding any new public page
- Adding blog posts, documentation, or content pages
- Adding pricing pages, about pages, contact pages

**How to update:**

```typescript
// Add new static pages
{
  url: `${baseUrl}/pricing`,
  lastModified: new Date(),
  changeFrequency: 'monthly',
  priority: 0.8,
},

// Add dynamic pages (blog, docs, etc.)
...blogPosts.map((post) => ({
  url: `${baseUrl}/blog/${post.slug}`,
  lastModified: post.updatedAt,
  changeFrequency: 'weekly',
  priority: 0.7,
})),
```

**Priority Guidelines:**

- Homepage (`/`): `1.0`
- Main features/pricing: `0.8`
- Blog posts/docs: `0.7`
- About/contact: `0.6`
- Legal pages: `0.5`

### 2. **Robots** (`app/robots.ts`) - UPDATE WHEN NEEDED

This project uses the Next.js Metadata API (`app/robots.ts` returning `MetadataRoute.Robots`), not a hand-written `robots.txt` route.

**When to update:**

- Adding public pages that should be indexed
- Adding pages that should NOT be indexed (admin, internal tools)
- Adding new API routes that should be blocked

**How to update:**

```typescript
// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        // Allow new public pages
        allow: ['/', '/home', '/privacy', '/terms', '/pricing', '/blog', '/docs'],
        // Block new private/internal pages
        disallow: ['/onboarding', '/sign-in', '/sign-up', '/admin', '/internal', '/api/internal'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

### 3. **Structured Data** - UPDATE FOR MAJOR FEATURES

**When to update:**

- Adding pricing/billing features
- Adding blog/content features
- Changing core product offering
- Adding organization/company information

**Examples:**

**For Pricing Pages:**

```typescript
export function PricingStructuredData({ plans }: { plans: PricingPlan[] }) {
  const offers = plans.map(plan => ({
    '@type': 'Offer',
    name: plan.name,
    price: plan.price,
    priceCurrency: 'USD',
    description: plan.description,
  }));

  return (
    <Script
      id="pricing-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: 'Kosuke Template',
          offers: offers,
        }),
      }}
    />
  );
}
```

**For Blog Posts:**

```typescript
export function ArticleStructuredData({ post }: { post: BlogPost }) {
  return (
    <Script
      id="article-structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          author: {
            '@type': 'Person',
            name: post.author.name,
          },
          datePublished: post.publishedAt,
          dateModified: post.updatedAt,
          image: post.image,
        }),
      }}
    />
  );
}
```

### 4. **Page Metadata** - ALWAYS ADD FOR NEW PUBLIC PAGES

**For every new public page, add proper metadata:**

```typescript
// Static page metadata
export const metadata: Metadata = {
  title: 'Page Title',
  description: 'Clear, compelling description under 160 characters',
  keywords: ['relevant', 'keywords', 'for', 'this', 'page'],
  openGraph: {
    title: 'Page Title | Kosuke Template',
    description: 'Same description as above',
    type: 'website', // or 'article' for blog posts
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Page Title | Kosuke Template',
    description: 'Same description as above',
  },
};

// Dynamic page metadata
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await fetchPageData(params.slug);

  return {
    title: data.title,
    description: data.description,
    // ... rest of metadata
  };
}
```

### 5. **Web Manifest** (`public/site.webmanifest`) - UPDATE FOR BRANDING CHANGES

**When to update:**

- Changing app name or branding
- Adding new icon sizes
- Changing theme colors

## 📋 SEO Checklist for New Features

### ✅ Adding a New Public Page

- [ ] Add to `app/sitemap.ts` with appropriate priority
- [ ] Add proper SEO metadata to the page component
- [ ] Ensure robots.txt allows the page (if not already covered)
- [ ] Add structured data if it's a major feature page
- [ ] Test with Google Search Console

### ✅ Adding Pricing/Billing Features

- [ ] Update `SoftwareStructuredData` to reflect new pricing
- [ ] Add pricing-specific structured data
- [ ] Add pricing page to sitemap with high priority (0.8)
- [ ] Update homepage metadata to mention pricing if relevant

### ✅ Adding Blog/Documentation

- [ ] Create dynamic sitemap entries for posts
- [ ] Add article structured data component
- [ ] Allow blog routes in robots.txt
- [ ] Set up proper metadata generation for posts
- [ ] Consider adding RSS feed

### ✅ Adding User-Generated Content

- [ ] Block user profile pages from indexing (robots.txt)
- [ ] Only index public content
- [ ] Add proper canonical URLs to prevent duplicate content
- [ ] Use noindex meta tag for private/draft content

## 🚫 SEO Anti-Patterns to Avoid

### ❌ Don't Index These Pages

- User dashboards (`/dashboard`, `/org/*`)
- Authentication pages (`/sign-in`, `/sign-up`)
- API routes (`/api/*`)
- Admin interfaces
- User-generated private content
- Draft/preview content

### ❌ Don't Forget These Updates

- Sitemap when adding public pages
- Structured data when changing core features
- SEO metadata for every new public page
- Robots.txt when adding sensitive routes

## 🔧 SEO Testing Commands

```bash
# Test sitemap generation
curl http://localhost:3000/sitemap.xml

# Test robots.txt
curl http://localhost:3000/robots.txt

# Test structured data with Google's tool
# https://search.google.com/test/rich-results

# Test metadata with social media debuggers
# Facebook: https://developers.facebook.com/tools/debug/
# Twitter: https://cards-dev.twitter.com/validator
```

## 📊 SEO Performance Monitoring

### Required Setup

1. **Google Search Console** - Monitor search performance
2. **Google Analytics** - Track organic traffic
3. **Core Web Vitals** - Already tracked via Sentry

### Regular Tasks

- Monitor search console for crawl errors
- Check sitemap submission status
- Review structured data errors
- Monitor page load speeds
- Track keyword rankings for main terms

## 🎯 Template-Specific SEO Strategy

### Primary Keywords

- "Next.js template"
- "React starter template"
- "TypeScript boilerplate"
- "Full-stack template"
- "Production-ready template"

### Content Strategy

- Focus on developer pain points
- Highlight time-saving benefits
- Showcase included features
- Provide clear setup instructions
- Maintain technical accuracy

Remember: **SEO is not optional** - it's essential for template discoverability and professional presentation. Always update SEO files when adding new features!
