/**
 * Strapi REST client (server-only)
 */

import 'server-only';
import { z } from 'zod';
import { captureException } from '@sentry/nextjs';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';
const STRAPI_TOKEN = process.env.STRAPI_TOKEN;

// Minimal Strapi REST response shapes (v4)
const rawImageSchema = z.object({
  url: z.string(),
  alternativeText: z.string().nullish(),
});

const strapiImageSchema = rawImageSchema.transform((img: z.infer<typeof rawImageSchema>) => ({
  url: img.url.startsWith('http') ? img.url : `${STRAPI_URL}${img.url}`,
  alt: img.alternativeText ?? '',
}));

const strapiTagSchema = z.object({ id: z.number(), attributes: z.object({ name: z.string(), slug: z.string() }) });

const strapiSeoSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalURL: z.string().optional(),
  ogImage: z
    .object({ data: z.object({ attributes: strapiImageSchema }) })
    .optional()
    .nullable(),
});

const blogPostAttributes = z.object({
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().optional().nullable(),
  content: z.any().optional().nullable(), // rich text JSON or HTML via Strapi plugins
  coverImage: z
    .object({ data: z.object({ attributes: strapiImageSchema }).nullable().optional() })
    .optional()
    .nullable(),
  authorName: z.string().optional().nullable(),
  publishedAt: z.string(),
  seo: strapiSeoSchema.optional().nullable(),
  tags: z
    .object({ data: z.array(strapiTagSchema).optional() })
    .optional()
    .nullable(),
});

const blogPostSchema = z.object({ id: z.number(), attributes: blogPostAttributes });

const singlePageAttributes = z.object({
  title: z.string(),
  slug: z.string().default(''),
  content: z.any().optional().nullable(),
  updatedAt: z.string(),
  seo: strapiSeoSchema.optional().nullable(),
});

const singlePageSchema = z.object({ id: z.number(), attributes: singlePageAttributes });

// Helpers
type NextRequestInit = RequestInit & { next?: { revalidate?: number } };
function getHeaders() {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (STRAPI_TOKEN) headers['Authorization'] = `Bearer ${STRAPI_TOKEN}`;
  return headers;
}

function toHtml(content: unknown): string {
  // If Strapi provides HTML directly, pass through; otherwise implement serializer as needed
  if (typeof content === 'string') return content;
  return '';
}

export interface ListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  tag?: string;
}

export async function fetchBlogPosts(params: ListParams = {}) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 10;
  const query = new URLSearchParams();
  query.set('pagination[page]', String(page));
  query.set('pagination[pageSize]', String(pageSize));
  query.set('populate', 'coverImage,tags,seo.ogImage');
  query.set('sort', 'publishedAt:desc');
  query.set('publicationState', 'live');
  if (params.search) query.set('filters[$or][0][title][$containsi]', params.search);
  if (params.tag) query.set('filters[tags][slug][$eq]', params.tag);

  const res = await fetch(
    `${STRAPI_URL}/api/blog-posts?${query.toString()}`,
    { headers: getHeaders(), next: { revalidate: 300 } } as NextRequestInit
  );
  if (!res.ok) throw new Error(`Failed to fetch blog posts: ${res.status}`);
  const json = (await res.json()) as { data: unknown[] };
  const parsed = z.array(blogPostSchema).safeParse(json.data);
  if (!parsed.success) {
    captureException(parsed.error);
    throw new Error('Invalid blog posts response');
  }

  return parsed.data.map((item: z.infer<typeof blogPostSchema>) => ({
    id: item.id,
    title: item.attributes.title,
    slug: item.attributes.slug,
    excerpt: item.attributes.excerpt ?? undefined,
    contentHtml: toHtml(item.attributes.content),
    coverImageUrl: item.attributes.coverImage?.data?.attributes.url,
    authorName: item.attributes.authorName ?? undefined,
    publishedAt: item.attributes.publishedAt,
    tags:
      item.attributes.tags?.data?.map((t: z.infer<typeof strapiTagSchema>) => ({
        id: t.id,
        name: t.attributes.name,
        slug: t.attributes.slug,
      })) ?? [],
    seo: item.attributes.seo
      ? {
          metaTitle: item.attributes.seo.metaTitle,
          metaDescription: item.attributes.seo.metaDescription,
          canonicalUrl: item.attributes.seo.canonicalURL,
          ogImageUrl: item.attributes.seo.ogImage?.data?.attributes.url,
        }
      : undefined,
  }));
}

export async function fetchBlogPostBySlug(slug: string) {
  const query = new URLSearchParams();
  query.set('filters[slug][$eq]', slug);
  query.set('populate', 'coverImage,tags,seo.ogImage');
  query.set('publicationState', 'live');

  const res = await fetch(
    `${STRAPI_URL}/api/blog-posts?${query.toString()}`,
    { headers: getHeaders(), next: { revalidate: 300 } } as NextRequestInit
  );
  if (!res.ok) throw new Error(`Failed to fetch blog post: ${res.status}`);
  const json = (await res.json()) as { data: unknown[] };
  const parsed = z.array(blogPostSchema).safeParse(json.data);
  if (!parsed.success) {
    captureException(parsed.error);
    throw new Error('Invalid blog post response');
  }
  const item = parsed.data[0];
  if (!item) return null;
  return {
    id: item.id,
    title: item.attributes.title,
    slug: item.attributes.slug,
    excerpt: item.attributes.excerpt ?? undefined,
    contentHtml: toHtml(item.attributes.content),
    coverImageUrl: item.attributes.coverImage?.data?.attributes.url,
    authorName: item.attributes.authorName ?? undefined,
    publishedAt: item.attributes.publishedAt,
    tags:
      item.attributes.tags?.data?.map((t: z.infer<typeof strapiTagSchema>) => ({
        id: t.id,
        name: t.attributes.name,
        slug: t.attributes.slug,
      })) ?? [],
    seo: item.attributes.seo
      ? {
          metaTitle: item.attributes.seo.metaTitle,
          metaDescription: item.attributes.seo.metaDescription,
          canonicalUrl: item.attributes.seo.canonicalURL,
          ogImageUrl: item.attributes.seo.ogImage?.data?.attributes.url,
        }
      : undefined,
  };
}

export async function fetchSinglePage(slug: 'privacy' | 'terms' | string) {
  const query = new URLSearchParams();
  query.set('filters[slug][$eq]', slug);
  query.set('populate', 'seo.ogImage');
  query.set('publicationState', 'live');

  const res = await fetch(
    `${STRAPI_URL}/api/pages?${query.toString()}`,
    { headers: getHeaders(), next: { revalidate: 300 } } as NextRequestInit
  );
  if (!res.ok) throw new Error(`Failed to fetch page: ${res.status}`);
  const json = (await res.json()) as { data: unknown[] };
  const parsed = z.array(singlePageSchema).safeParse(json.data);
  if (!parsed.success) {
    captureException(parsed.error);
    throw new Error('Invalid page response');
  }
  const item = parsed.data[0];
  if (!item) return null;
  return {
    id: item.id,
    title: item.attributes.title,
    slug: slug,
    contentHtml: toHtml(item.attributes.content),
    updatedAt: item.attributes.updatedAt,
    seo: item.attributes.seo
      ? {
          metaTitle: item.attributes.seo.metaTitle,
          metaDescription: item.attributes.seo.metaDescription,
          canonicalUrl: item.attributes.seo.canonicalURL,
          ogImageUrl: item.attributes.seo.ogImage?.data?.attributes.url,
        }
      : undefined,
  };
}

