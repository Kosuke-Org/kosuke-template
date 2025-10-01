/**
 * CMS domain types for Strapi-backed content
 * Centralized and client-safe
 */

export interface CmsSeo {
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
}

export interface BlogTag {
  id: number;
  name: string;
  slug: string;
}

export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  contentHtml: string; // normalized HTML from Strapi rich text
  coverImageUrl?: string;
  authorName?: string;
  tags?: BlogTag[];
  publishedAt: string; // ISO
  seo?: CmsSeo;
}

export interface CmsPage {
  id: number;
  title: string;
  slug: 'privacy' | 'terms' | string;
  contentHtml: string;
  updatedAt: string; // ISO
  seo?: CmsSeo;
}

