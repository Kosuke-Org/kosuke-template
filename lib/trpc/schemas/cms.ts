import { z } from 'zod';

export const listBlogSchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(50).optional(),
  search: z.string().trim().min(1).optional(),
  tag: z.string().trim().min(1).optional(),
});

export const blogBySlugSchema = z.object({ slug: z.string().min(1) });

export const pageBySlugSchema = z.object({ slug: z.enum(['privacy', 'terms']) });

