export interface Technology {
  name: string;
  description: string;
  logoPath: {
    light: string;
    dark: string;
  };
  url: string;
  category:
    | 'frontend'
    | 'backend'
    | 'database'
    | 'auth'
    | 'deployment'
    | 'monitoring'
    | 'testing'
    | 'styling'
    | 'email';
}

export const technologies: Technology[] = [
  {
    name: 'Next.js 15',
    description: 'The React framework for production with App Router and Server Components',
    logoPath: {
      light: '/logos/nextjs.svg',
      dark: '/logos/nextjs.svg',
    },
    url: 'https://nextjs.org',
    category: 'frontend',
  },
  {
    name: 'React 19',
    description: 'A JavaScript library for building user interfaces with the latest features',
    logoPath: {
      light: '/logos/react_light.svg',
      dark: '/logos/react_dark.svg',
    },
    url: 'https://react.dev',
    category: 'frontend',
  },
  {
    name: 'TypeScript',
    description: 'JavaScript with syntax for types, providing better developer experience',
    logoPath: {
      light: '/logos/typescript.svg',
      dark: '/logos/typescript.svg',
    },
    url: 'https://www.typescriptlang.org',
    category: 'frontend',
  },
  {
    name: 'Tailwind CSS',
    description: 'A utility-first CSS framework for rapidly building custom designs',
    logoPath: {
      light: '/logos/tailwindcss.svg',
      dark: '/logos/tailwindcss.svg',
    },
    url: 'https://tailwindcss.com',
    category: 'styling',
  },
  {
    name: 'Shadcn/ui',
    description: 'Beautifully designed components built with Radix UI and Tailwind CSS',
    logoPath: {
      light: '/logos/shadcn_light.svg',
      dark: '/logos/shadcn_dark.svg',
    },
    url: 'https://ui.shadcn.com',
    category: 'styling',
  },
  {
    name: 'Clerk',
    description: 'Complete user management with social logins and authentication',
    logoPath: {
      light: '/logos/clerk_light.svg',
      dark: '/logos/clerk_dark.svg',
    },
    url: 'https://clerk.com',
    category: 'auth',
  },
  {
    name: 'PostgreSQL',
    description: "The world's most advanced open source relational database",
    logoPath: {
      light: '/logos/postgresql.svg',
      dark: '/logos/postgresql.svg',
    },
    url: 'https://www.postgresql.org',
    category: 'database',
  },
  {
    name: 'Drizzle ORM',
    description: 'TypeScript ORM that is production ready and developer friendly',
    logoPath: {
      light: '/logos/drizzle_orm_light.svg',
      dark: '/logos/drizzle_orm_dark.svg',
    },
    url: 'https://orm.drizzle.team',
    category: 'database',
  },
  {
    name: 'Vercel',
    description: 'The platform for frontend developers, providing speed and reliability',
    logoPath: {
      light: '/logos/vercel_light.svg',
      dark: '/logos/vercel_dark.svg',
    },
    url: 'https://vercel.com',
    category: 'deployment',
  },
  {
    name: 'Sentry',
    description: 'Application monitoring and error tracking for better user experience',
    logoPath: {
      light: '/logos/sentry.svg',
      dark: '/logos/sentry.svg',
    },
    url: 'https://sentry.io',
    category: 'monitoring',
  },
  {
    name: 'Framer Motion',
    description: 'A production-ready motion library for React with simple declarative API',
    logoPath: {
      light: '/logos/framer_light.svg',
      dark: '/logos/framer_dark.svg',
    },
    url: 'https://www.framer.com/motion',
    category: 'frontend',
  },
  {
    name: 'Vitest',
    description: 'Next Generation Testing Framework',
    logoPath: {
      light: '/logos/vitest.svg',
      dark: '/logos/vitest.svg',
    },
    url: 'https://vitest.dev/',
    category: 'testing',
  },
  {
    name: 'Resend',
    description: 'Email API for developers with beautiful templates and analytics',
    logoPath: {
      light: '/logos/resend_light.svg',
      dark: '/logos/resend_dark.svg',
    },
    url: 'https://resend.com',
    category: 'email',
  },
  {
    name: 'Stripe',
    description: 'Payment infrastructure for the internet with powerful subscription management',
    logoPath: {
      light: '/logos/stripe_light.svg',
      dark: '/logos/stripe_dark.svg',
    },
    url: 'https://stripe.com',
    category: 'backend',
  },
];

export const getTechnologiesByCategory = (category: Technology['category']) => {
  return technologies.filter((tech) => tech.category === category);
};

export const getFeaturedTechnologies = () => {
  return technologies.filter((tech) =>
    [
      'Next.js 15',
      'React 19',
      'TypeScript',
      'Tailwind CSS',
      'Shadcn/ui',
      'Clerk',
      'Drizzle ORM',
    ].includes(tech.name)
  );
};
