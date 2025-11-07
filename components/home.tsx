'use client';

import { Star, Zap, Rocket, ArrowRight, Code2, Database, Lock, Sparkles } from 'lucide-react';
import { technologies } from '@/app/(logged-out)/home/data/technologies';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TechLogo } from '@/app/(logged-out)/home/components/tech-card';
import Link from 'next/link';
import { useUser } from '@/hooks/use-user';
import { useActiveOrganization } from '@/hooks/use-active-organization';

const coreFeatures = [
  {
    icon: Code2,
    title: 'Next.js 15 + React 19',
    description: 'Latest App Router with Server Components, Suspense, and streaming.',
    metrics: '~3s build time',
  },
  {
    icon: Lock,
    title: 'Auth & Security',
    description: 'Clerk integration with middleware protection and user management.',
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
  const { activeOrganization } = useActiveOrganization();

  const dashboardUrl = activeOrganization ? `/org/${activeOrganization.slug}/dashboard` : '/';

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Hero Section - Terminal First */}
      <section className="pt-12 sm:pt-20 pb-16 sm:pb-32 px-4 sm:px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Main headline */}
          <motion.div
            className="text-center mb-8 sm:mb-16"
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
                className="mb-4 sm:mb-6 px-2 sm:px-3 py-1 text-xs cursor-default relative overflow-hidden"
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
                <Sparkles className="w-3 h-3 mr-1" />
                Production Ready
              </Badge>
            </motion.div>

            <h1 className="text-3xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight px-2">
              Skip the boilerplate
              <br />
              Ship features
            </h1>

            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto font-sans px-2">
              Production-ready Next.js template with auth, billing, database, and deployment.
            </p>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-2"
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
      <section className="py-12 sm:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              # Everything you need
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              Carefully chosen technologies that work together seamlessly
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-5xl mx-auto">
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
                    <div className="flex items-start justify-between mb-3 sm:mb-4">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                        <feature.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {feature.metrics}
                      </Badge>
                    </div>

                    <h3 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">
                      {feature.title}
                    </h3>

                    <p className="text-sm sm:text-base text-muted-foreground font-sans leading-relaxed">
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
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              # built with
            </h2>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4 sm:gap-8 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {technologies.map((tech, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center group cursor-pointer"
                whileHover={{ y: -2 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="p-2 sm:p-3 rounded-lg bg-card/30 border border-border/30 transition-all duration-300">
                  <TechLogo name={tech.name} logoPath={tech.logoPath} url={tech.url} size="md" />
                </div>
                <span className="text-xs mt-2 text-muted-foreground group-hover:text-foreground transition-colors text-center">
                  {tech.name.toLowerCase()}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-12 sm:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            className="text-center mb-12 sm:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4">
              # Why developers choose this
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto font-sans px-2">
              Every component designed for speed, security, and scale
            </p>
          </motion.div>

          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Large feature card */}
              <motion.div
                className="lg:col-span-2 lg:row-span-2"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <Card className="h-full p-6 sm:p-8 bg-card border border-border hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-0 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-4 sm:mb-6">
                        <div className="p-2 rounded-lg bg-muted">
                          <Rocket className="h-5 w-5 sm:h-6 sm:w-6 text-foreground" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold">Ship in Minutes</h3>
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground font-sans mb-4 sm:mb-6 leading-relaxed">
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
                <Card className="h-full p-4 sm:p-6 bg-card/50 border border-border hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                      <h3 className="text-base sm:text-lg font-semibold">Secure Auth</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans">
                      Clerk integration with social logins, MFA, and enterprise SSO ready.
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
                <Card className="h-full p-4 sm:p-6 bg-card/50 border border-border hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Database className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                      <h3 className="text-base sm:text-lg font-semibold">Type-Safe DB</h3>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans">
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
                <Card className="h-full p-4 sm:p-6 bg-card border border-border hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                      <div className="flex items-center gap-2">
                        <Rocket className="h-4 w-4 sm:h-5 sm:w-5 text-foreground" />
                        <h3 className="text-base sm:text-lg font-semibold">Revenue Ready</h3>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Stripe
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-sans">
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
      <section className="py-16 sm:py-32 px-4 sm:px-6 bg-background">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6">
              Ready to ship?
            </h2>

            <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-12 font-sans px-2">
              Join developers building the next generation of web applications
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
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
