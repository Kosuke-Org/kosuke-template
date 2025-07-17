export interface Technology {
  name: string;
  description: string;
  logoPath: string;
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
    logoPath: '/logos/nextjs.svg',
    url: 'https://nextjs.org',
    category: 'frontend',
  },
  {
    name: 'React 19',
    description: 'A JavaScript library for building user interfaces with the latest features',
    logoPath: '/logos/react.svg',
    url: 'https://react.dev',
    category: 'frontend',
  },
  {
    name: 'TypeScript',
    description: 'JavaScript with syntax for types, providing better developer experience',
    logoPath: '/logos/typescript.svg',
    url: 'https://www.typescriptlang.org',
    category: 'frontend',
  },
  {
    name: 'Tailwind CSS',
    description: 'A utility-first CSS framework for rapidly building custom designs',
    logoPath: '/logos/tailwindcss.svg',
    url: 'https://tailwindcss.com',
    category: 'styling',
  },
  {
    name: 'Shadcn/ui',
    description: 'Beautifully designed components built with Radix UI and Tailwind CSS',
    logoPath: '/logos/shadcn.svg',
    url: 'https://ui.shadcn.com',
    category: 'styling',
  },
  {
    name: 'Clerk',
    description: 'Complete user management with social logins and authentication',
    logoPath: '/logos/clerk.svg',
    url: 'https://clerk.com',
    category: 'auth',
  },
  {
    name: 'PostgreSQL',
    description: "The world's most advanced open source relational database",
    logoPath: '/logos/postgresql.svg',
    url: 'https://www.postgresql.org',
    category: 'database',
  },
  {
    name: 'Drizzle ORM',
    description: 'TypeScript ORM that is production ready and developer friendly',
    logoPath: '/logos/drizzle.svg',
    url: 'https://orm.drizzle.team',
    category: 'database',
  },
  {
    name: 'Vercel',
    description: 'The platform for frontend developers, providing speed and reliability',
    logoPath: '/logos/vercel.svg',
    url: 'https://vercel.com',
    category: 'deployment',
  },
  {
    name: 'Sentry',
    description: 'Application monitoring and error tracking for better user experience',
    logoPath: '/logos/sentry.svg',
    url: 'https://sentry.io',
    category: 'monitoring',
  },
  {
    name: 'Framer Motion',
    description: 'A production-ready motion library for React with simple declarative API',
    logoPath: '/logos/framer-motion.svg',
    url: 'https://www.framer.com/motion',
    category: 'frontend',
  },
  {
    name: 'Jest',
    description: 'A delightful JavaScript testing framework with a focus on simplicity',
    logoPath: '/logos/jest.svg',
    url: 'https://jestjs.io',
    category: 'testing',
  },
  {
    name: 'Resend',
    description: 'Email API for developers with beautiful templates and analytics',
    logoPath: '/logos/resend.svg',
    url: 'https://resend.com',
    category: 'email',
  },
  {
    name: 'Polar',
    description: 'Subscription management and billing made simple for developers',
    logoPath: '/logos/polar.svg',
    url: 'https://polar.sh',
    category: 'backend',
  },
];

export const getTechnologiesByCategory = (category: Technology['category']) => {
  return technologies.filter((tech) => tech.category === category);
};

export const getFeaturedTechnologies = () => {
  return technologies.filter((tech) =>
    ['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Shadcn/ui', 'Clerk'].includes(
      tech.name
    )
  );
};
