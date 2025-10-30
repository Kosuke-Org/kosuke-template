import { Home } from '@/components/home';
import Script from 'next/script';

export default function RootPage() {
  return (
    <>
      <HomepageStructuredData />
      <Home />
    </>
  );
}

const HomepageStructuredData = () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://template.kosuke.ai';

  const websiteData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Kosuke Template',
    description:
      'Production-ready Next.js template with auth, billing, database, and deployment. Skip the boilerplate and ship features fast.',
    url: baseUrl,
    sameAs: ['https://github.com/Kosuke-Org/kosuke-template'],
  };

  const softwareData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Kosuke Template',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Web Browser',
    description:
      'Production-ready Next.js template with authentication, billing, database, and deployment features built-in.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: 'Kosuke Template',
    },
    programmingLanguage: ['TypeScript', 'JavaScript', 'React'],
    runtimePlatform: 'Node.js',
    codeRepository: 'https://github.com/Kosuke-Org/kosuke-template',
  };

  return (
    <>
      <Script
        id="website-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteData),
        }}
      />
      <Script
        id="software-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareData),
        }}
      />
    </>
  );
};
