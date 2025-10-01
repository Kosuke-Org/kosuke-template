import { router, publicProcedure } from '../init';
import { listBlogSchema, blogBySlugSchema, pageBySlugSchema } from '../schemas/cms';
import { fetchBlogPosts, fetchBlogPostBySlug, fetchSinglePage } from '@/lib/cms/strapi';

export const cmsRouter = router({
  blog: router({
    list: publicProcedure.input(listBlogSchema.optional()).query(async ({ input }) => {
      const posts = await fetchBlogPosts({
        page: input?.page,
        pageSize: input?.pageSize,
        search: input?.search,
        tag: input?.tag,
      });
      return posts;
    }),

    bySlug: publicProcedure.input(blogBySlugSchema).query(async ({ input }) => {
      const post = await fetchBlogPostBySlug(input.slug);
      if (!post) return null;
      return post;
    }),
  }),

  page: router({
    bySlug: publicProcedure.input(pageBySlugSchema).query(async ({ input }) => {
      const page = await fetchSinglePage(input.slug);
      if (!page) return null;
      return page;
    }),
  }),
});

