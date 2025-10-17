const knipConfig = {
  $schema: 'https://unpkg.com/knip@latest/schema.json',
  ignore: [
    'engine/**',
    'docs/**',
    'cli/venv/**',
    '.react-email/**',
    'components/ui/**',
    'knip.config.ts',
    // Chart/skeleton components are template examples
    'components/skeletons.tsx',
    'components/charts/**',
    // Library barrel exports (infrastructure for template users)
    'lib/billing/index.ts',
    'lib/engine/client.ts',
    'lib/organizations/index.ts',
    'lib/organizations/sync.ts',
    'lib/trpc/init.ts',
    'lib/trpc/server.ts',
  ],
  ignoreDependencies: [
    // Shadcn/UI dependencies (only used in components/ui/** which is ignored)
    '@radix-ui/*',
    'cmdk',
    'embla-carousel-react',
    'input-otp',
    'react-resizable-panels',
    'tailwindcss',
    'tailwindcss-animate',
    'vaul',
    // TODO: check if we should use these dependencies
    'drizzle-zod',
    '@trpc/next',
  ],
  ignoreExportsUsedInFile: {
    interface: true,
    type: true,
  },
  ignoreBinaries: ['uv'],
  rules: {
    files: 'error',
    dependencies: 'warn',
    devDependencies: 'warn',
    unlisted: 'off',
    binaries: 'warn',
    unresolved: 'off',
    exports: 'error',
    types: 'error',
    nsExports: 'off',
    nsTypes: 'off',
    duplicates: 'error',
    enumMembers: 'warn',
    classMembers: 'warn',
  },
};

export default knipConfig;
