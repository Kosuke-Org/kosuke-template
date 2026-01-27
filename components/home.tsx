'use client';

import Link from 'next/link';

import { motion } from 'framer-motion';
import { ArrowRight, Code2, Database, Lock, Rocket, Sparkles, Star, Zap } from 'lucide-react';

import { TechLogo } from '@/app/(logged-out)/home/components/tech-card';
import { technologies } from '@/app/(logged-out)/home/data/technologies';

import { useOrganization } from '@/hooks/use-organization';
import { useUser } from '@/hooks/use-user';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const coreFeatures = [
  {
    icon: Code2,
    title: 'Next.js 16 + React 19',
    description: 'Latest App Router with Server Components, Suspense, and streaming.',
    metrics: '~3s build time',
  },
  {
    icon: Lock,
    title: 'Auth & Security',
    description: 'Better Auth integration with middleware protection and user management.',
    metrics: 'SOC 2 compliant',
  },
  {
    icon: Database,
    title: 'Database & ORM',
    description: 'Drizzle ORM with PostgreSQL, migrations, and type safety.',
    metrics: 'Type-safe queries',
  },
  {
    icon: Zap,
    title: 'Billing Ready',
    description: 'Stripe integration for subscriptions, webhooks, and payments.',
    metrics: 'PCI compliant',
  },
];

export function Home() {
  const { user } = useUser();
  const { organization } = useOrganization();

  const dashboardUrl = organization ? `/org/${organization.slug}/dashboard` : '/';

  return (
    <div className="bg-background min-h-screen w-full pt-[60px]">
      {/* Hero Section - Terminal First */}
      <section className="px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-32">
        <div className="container mx-auto max-w-6xl">
          {/* Main headline */}
          <motion.div
            className="mb-8 text-center sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Badge
                variant="outline"
                className="relative mb-4 cursor-default overflow-hidden px-2 py-1 text-xs sm:mb-6 sm:px-3"
              >
                {/* Shine effect */}
                <motion.div
                  className="absolute inset-0 -top-1 -bottom-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  initial={{ x: '-100%' }}
                  animate={{ x: '200%' }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3,
                    ease: 'easeInOut',
                  }}
                />
                <Sparkles className="mr-1 h-3 w-3" />
                Production Ready
              </Badge>
            </motion.div>

            <h1 className="mb-4 px-2 text-3xl leading-tight font-bold tracking-tight sm:mb-6 sm:text-5xl lg:text-7xl">
              Tet
            </h1>

            <p className="text-muted-foreground mx-auto mb-6 max-w-2xl px-2 font-sans text-base sm:mb-8 sm:text-lg lg:text-xl">
              Production-ready Next.js template with auth, billing, database, and deployment.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col items-center justify-center gap-3 px-2 sm:flex-row sm:gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {user ? (
              // Logged-in user CTAs
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href={dashboardUrl}>
                  <Rocket className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Link>
              </Button>
            ) : (
              // Logged-out user CTAs
              <Button size="lg" className="w-full sm:w-auto" asChild>
                <Link href="https://github.com/Kosuke-Org/kosuke-template" target="_blank">
                  <Rocket className="mr-2 h-4 w-4" />
                  git clone kosuke
                </Link>
              </Button>
            )}

            <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
              <Link href="https://github.com/Kosuke-Org/kosuke-template#readme" target="_blank">
                <Code2 className="mr-2 h-4 w-4" />
                Documentation
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Core Features */}
      <section className="bg-background py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            className="mb-12 text-center sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-3xl lg:text-4xl">
              # Everything you need
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl px-2 font-sans text-base sm:text-lg">
              Carefully chosen technologies that work together seamlessly
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2">
            {coreFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full py-4 transition-colors">
                  <CardContent className="py-0">
                    <div className="mb-3 flex items-start justify-between sm:mb-4">
                      <div className="bg-muted text-muted-foreground rounded-lg p-2">
                        <feature.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {feature.metrics}
                      </Badge>
                    </div>

                    <h3 className="mb-2 text-lg font-semibold sm:mb-3 sm:text-xl">
                      {feature.title}
                    </h3>

                    <p className="text-muted-foreground font-sans text-sm leading-relaxed sm:text-base">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack - Minimal Grid */}
      <section className="py-24 sm:py-48">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            className="mb-12 text-center sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-3xl lg:text-4xl">
              # built with
            </h2>
          </motion.div>

          <motion.div
            className="mx-auto grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-8 md:grid-cols-7"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {technologies.map((tech, index) => (
              <motion.div
                key={index}
                className="group flex cursor-pointer flex-col items-center"
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="bg-card/30 border-border/30 rounded-lg border p-2 transition-all duration-300 sm:p-3">
                  <TechLogo name={tech.name} logoPath={tech.logoPath} url={tech.url} size="md" />
                </div>
                <span className="text-muted-foreground group-hover:text-foreground mt-2 text-center text-xs transition-colors">
                  {tech.name.toLowerCase()}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="bg-background py-12 sm:py-20">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            className="mb-12 text-center sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-3 text-2xl font-bold sm:mb-4 sm:text-3xl lg:text-4xl">
              # Why developers choose this
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl px-2 font-sans text-base sm:text-lg">
              Every component designed for speed, security, and scale
            </p>
          </motion.div>

          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
              {/* Large feature card */}
              <motion.div
                className="lg:col-span-2 lg:row-span-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Card className="bg-card border-border hover:bg-card/80 h-full border p-6 transition-all duration-300 sm:p-8">
                  <CardContent className="flex h-full flex-col justify-between p-0">
                    <div>
                      <div className="mb-4 flex items-center gap-3 sm:mb-6">
                        <div className="bg-muted rounded-lg p-2">
                          <Rocket className="text-foreground h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <h3 className="text-lg font-semibold sm:text-xl">Ship in Minutes</h3>
                      </div>
                      <p className="text-muted-foreground mb-4 font-sans text-sm leading-relaxed sm:mb-6 sm:text-base">
                        Complete full-stack application with authentication, database, billing, and
                        deployment. Everything integrated and configured - just clone and ship.
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clone to Deploy</span>
                        <span className="text-foreground">&lt; 5 min</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Auth + DB + Billing</span>
                        <span className="text-foreground">✓ Included</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Production Ready</span>
                        <span className="text-foreground">Day 1</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Auth card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <Card className="bg-card/50 border-border hover:bg-card/80 h-full border p-4 transition-all duration-300 sm:p-6">
                  <CardContent className="p-0">
                    <div className="mb-3 flex items-center gap-2 sm:mb-4">
                      <Lock className="text-foreground h-4 w-4 sm:h-5 sm:w-5" />
                      <h3 className="text-base font-semibold sm:text-lg">Secure Auth</h3>
                    </div>
                    <p className="text-muted-foreground font-sans text-sm">
                      Better Auth integration with passwordless authentication and organization
                      management.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Database card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <Card className="bg-card/50 border-border hover:bg-card/80 h-full border p-4 transition-all duration-300 sm:p-6">
                  <CardContent className="p-0">
                    <div className="mb-3 flex items-center gap-2 sm:mb-4">
                      <Database className="text-foreground h-4 w-4 sm:h-5 sm:w-5" />
                      <h3 className="text-base font-semibold sm:text-lg">Type-Safe DB</h3>
                    </div>
                    <p className="text-muted-foreground font-sans text-sm">
                      Drizzle ORM with PostgreSQL. Migrations, relations, and full TypeScript
                      support.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Billing card */}
              <motion.div
                className="md:col-span-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card className="bg-card border-border hover:bg-card/80 h-full border p-4 transition-all duration-300 sm:p-6">
                  <CardContent className="p-0">
                    <div className="mb-3 flex items-center justify-between sm:mb-4">
                      <div className="flex items-center gap-2">
                        <Rocket className="text-foreground h-4 w-4 sm:h-5 sm:w-5" />
                        <h3 className="text-base font-semibold sm:text-lg">Revenue Ready</h3>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Stripe
                      </Badge>
                    </div>
                    <p className="text-muted-foreground font-sans text-sm">
                      Complete subscription management with webhooks, usage tracking, and analytics.
                      Start monetizing from day one.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-background px-4 py-16 sm:px-6 sm:py-32">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="mb-4 text-3xl font-bold sm:mb-6 sm:text-4xl lg:text-5xl">
              Ready to ship?
            </h2>

            <p className="text-muted-foreground mb-8 px-2 font-sans text-base sm:mb-12 sm:text-lg">
              Join developers building the next generation of web applications
            </p>

            <div className="flex flex-col justify-center gap-3 sm:flex-row sm:gap-4">
              {user ? (
                // Logged-in user final CTA
                <>
                  <Button size="lg" className="w-full sm:w-auto" asChild>
                    <Link href={dashboardUrl}>
                      <Rocket className="mr-2 h-4 w-4" />
                      Go to Dashboard
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                    <Link href="https://github.com/Kosuke-Org/kosuke-template" target="_blank">
                      <Star className="mr-2 h-4 w-4" />
                      Star on GitHub
                    </Link>
                  </Button>
                </>
              ) : (
                // Logged-out user final CTA
                <>
                  <Button size="lg" className="w-full sm:w-auto" asChild>
                    <Link href="https://github.com/Kosuke-Org/kosuke-template" target="_blank">
                      <Star className="mr-2 h-4 w-4" />
                      Star on GitHub
                    </Link>
                  </Button>

                  <Button size="lg" variant="outline" className="w-full sm:w-auto" asChild>
                    <Link
                      href="https://github.com/Kosuke-Org/kosuke-template/blob/main/cli/README.md"
                      target="_blank"
                    >
                      Setup Guide
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
