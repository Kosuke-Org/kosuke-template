import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';
  const currentDate = new Date();

  // Define your app's main routes here
  const routes = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    // Add more static routes as needed
    // {
    //   url: `${baseUrl}/about`,
    //   lastModified: currentDate,
    //   changeFrequency: 'monthly' as const,
    //   priority: 0.8,
    // },
    // {
    //   url: `${baseUrl}/contact`,
    //   lastModified: currentDate,
    //   changeFrequency: 'monthly' as const,
    //   priority: 0.7,
    // },
  ];

  return routes;
}
