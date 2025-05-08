import { MetadataRoute } from 'next';

function getAppRoutes(): string[] {
  // Manually list your static page routes here.
  // This should correspond to the `page.tsx` or `page.js` files in your `app` directory.
  const staticRoutes = [
    '/',
    // Add other static routes here, e.g., '/about', '/contact'
  ];

  // For dynamic routes (e.g., app/blog/[slug]/page.tsx), you would typically:
  // 1. Fetch all possible slugs (e.g., from a database or CMS).
  // 2. Map them to their full paths (e.g., `/blog/${slug}`).
  // const dynamicBlogRoutes = getAllBlogSlugs().map(slug => `/blog/${slug}`);
  // return [...staticRoutes, ...dynamicBlogRoutes];

  return staticRoutes;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  let baseUrl = 'http://localhost:3000'; // Default for local dev

  if (siteUrl) {
    baseUrl = siteUrl;
  } else {
    console.warn(
      `[SITEMAP WARNING] NEXT_PUBLIC_SITE_URL environment variable is not set. Defaulting to ${baseUrl}. Ensure this is set to your production URL in your environment.`
    );
  }

  const routes = getAppRoutes();

  const sitemapEntries: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(), // Or a specific date for each page
    changeFrequency: 'monthly', // Adjust as needed ('always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never')
    priority: route === '/' ? 1 : 0.8, // Adjust priority (0.0 to 1.0)
  }));

  return sitemapEntries;
}
