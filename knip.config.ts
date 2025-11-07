const knipConfig = {
  $schema: 'https://unpkg.com/knip@latest/schema.json',
  ignore: [
    '.venv/**',
    'engine/**',
    'cli/**',
    // Shadcn/UI components, we keep them as part of the template
    'components/ui/**',
    // Chart/skeleton components are template examples
    'components/skeletons.tsx',
    'components/charts/**',
    // React Email templates, scanned by email dev server
    'emails/**',
    // Library barrel exports, infrastructure for template users
    'lib/**/index.ts',
    // Queue system - public API for manual job triggering
    'lib/queue/queues/**',
  ],
  ignoreDependencies: [
    // Shadcn/UI dependencies (only used in components/ui/** which is ignored)
    '@radix-ui/*',
    'cmdk',
    'embla-carousel-react',
    'react-resizable-panels',
    'tailwindcss',
    'tailwindcss-animate',
    'vaul',
    // TODO: check if we should use these dependencies
    'drizzle-zod',
    '@trpc/next',
  ],
  ignoreBinaries: ['uv'],
  rules: {
    files: 'error',
    dependencies: 'error',
    devDependencies: 'warn',
    unlisted: 'error',
    binaries: 'error',
    unresolved: 'error',
    exports: 'error',
    types: 'error',
    nsExports: 'error',
    nsTypes: 'error',
    duplicates: 'error',
    enumMembers: 'error',
    classMembers: 'error',
  },
};

export default knipConfig;
