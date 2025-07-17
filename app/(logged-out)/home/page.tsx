'use client';

import {
  CheckCircle2,
  Github,
  Twitter,
  Star,
  Code2,
  Zap,
  Rocket,
  Shield,
  Database,
  Palette,
  ArrowRight,
  Copy,
  Check,
  Mail,
} from 'lucide-react';
import { motion, type Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useState } from 'react';

export default function HomePage() {
  const [copiedCommand, setCopiedCommand] = useState(false);

  const handleCopyCommand = () => {
    navigator.clipboard.writeText('git clone https://github.com/filopedraz/kosuke-template.git');
    setCopiedCommand(true);
    setTimeout(() => setCopiedCommand(false), 2000);
  };

  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const item: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
      },
    },
  };

  const features = [
    {
      icon: Rocket,
      title: 'Next.js 15 + React 19',
      description: 'Latest framework with App Router and Server Components',
    },
    {
      icon: Shield,
      title: 'Clerk Authentication',
      description: 'Complete user management with social logins',
    },
    {
      icon: Database,
      title: 'PostgreSQL + Drizzle',
      description: 'Type-safe database with modern ORM',
    },
    {
      icon: Palette,
      title: 'Shadcn UI + Tailwind',
      description: 'Beautiful components with utility-first CSS',
    },
    {
      icon: Zap,
      title: 'Polar Billing',
      description: 'Subscription management made simple',
    },
    {
      icon: Mail,
      title: 'Resend Email Service',
      description: 'Beautiful emails with welcome messages and notifications',
    },
    {
      icon: Code2,
      title: 'TypeScript + Sentry',
      description: 'Full type safety and error monitoring',
    },
  ];

  const projects = [
    {
      name: 'Next.js',
      description: 'The React Framework for Production',
      logo: '/logos/nextjs.svg',
      url: 'https://nextjs.org',
      category: 'Framework',
    },
    {
      name: 'React',
      description: 'A JavaScript library for building user interfaces',
      logo: '/logos/react.svg',
      url: 'https://react.dev',
      category: 'Library',
    },
    {
      name: 'TypeScript',
      description: 'JavaScript with syntax for types',
      logo: '/logos/typescript.svg',
      url: 'https://www.typescriptlang.org',
      category: 'Language',
    },
    {
      name: 'Tailwind CSS',
      description: 'A utility-first CSS framework',
      logo: '/logos/tailwind.svg',
      url: 'https://tailwindcss.com',
      category: 'Styling',
    },
    {
      name: 'shadcn/ui',
      description: 'Beautifully designed components',
      logo: '/logos/shadcn.svg',
      url: 'https://ui.shadcn.com',
      category: 'Components',
    },
    {
      name: 'Clerk',
      description: 'Complete user management platform',
      logo: '/logos/clerk.svg',
      url: 'https://clerk.com',
      category: 'Authentication',
    },
    {
      name: 'PostgreSQL',
      description: "The world's most advanced open source database",
      logo: '/logos/postgresql.svg',
      url: 'https://www.postgresql.org',
      category: 'Database',
    },
    {
      name: 'Drizzle ORM',
      description: 'TypeScript ORM for SQL databases',
      logo: '/logos/drizzle.svg',
      url: 'https://orm.drizzle.team',
      category: 'ORM',
    },
    {
      name: 'Polar',
      description: 'Subscription billing made simple',
      logo: '/logos/polar.svg',
      url: 'https://polar.sh',
      category: 'Billing',
    },
    {
      name: 'Resend',
      description: 'Email for developers',
      logo: '/logos/resend.svg',
      url: 'https://resend.com',
      category: 'Email',
    },
    {
      name: 'Vercel',
      description: 'The frontend cloud',
      logo: '/logos/vercel.svg',
      url: 'https://vercel.com',
      category: 'Hosting',
    },
    {
      name: 'Sentry',
      description: 'Application monitoring and error tracking',
      logo: '/logos/sentry.svg',
      url: 'https://sentry.io',
      category: 'Monitoring',
    },
    {
      name: 'Framer Motion',
      description: 'A production-ready motion library for React',
      logo: '/logos/framer.svg',
      url: 'https://www.framer.com/motion',
      category: 'Animation',
    },
    {
      name: 'Jest',
      description: 'Delightful JavaScript testing',
      logo: '/logos/jest.svg',
      url: 'https://jestjs.io',
      category: 'Testing',
    },
  ];

  const useCases = [
    'SaaS Applications',
    'E-commerce Platforms',
    'Admin Dashboards',
    'Landing Pages',
    'Portfolio Sites',
    'MVP Development',
  ];

  return (
    <div className="w-full min-h-screen font-[family-name:var(--font-geist-sans)]">
      {/* Hero Section */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h1
              className="text-5xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Kosuke Template
            </motion.h1>

            <motion.p
              className="text-xl lg:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              The modern, production-ready Next.js template with everything you need to build
              amazing web applications.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <Button
                className="px-6 py-3"
                onClick={() =>
                  window.open('https://github.com/filopedraz/kosuke-template', '_blank')
                }
              >
                <Star className="mr-2 h-4 w-4" />
                Star on GitHub
              </Button>
              <Button
                variant="outline"
                className="px-6 py-3"
                onClick={() =>
                  window.open('https://github.com/filopedraz/kosuke-template', '_blank')
                }
              >
                <Github className="mr-2 h-4 w-4" />
                View Repository
              </Button>
            </motion.div>

            {/* Quick Command */}
            <motion.div
              className="inline-flex items-center gap-2 bg-muted/50 rounded-lg p-4 font-mono text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              <span className="text-muted-foreground">$</span>
              <span>git clone https://github.com/filopedraz/kosuke-template.git</span>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleCopyCommand}>
                {copiedCommand ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built with the latest technologies and best practices for modern web development.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={item}>
                <Card className="h-full border-0 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <feature.icon className="h-12 w-12 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Why Choose Kosuke?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Skip the setup hassle and focus on building your amazing product.
            </p>
          </motion.div>

          <motion.div
            className="grid lg:grid-cols-3 gap-8"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <motion.div variants={item} className="text-center">
              <div className="mb-6">
                <Zap className="h-16 w-16 text-primary mx-auto" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Optimized for performance with the latest Next.js features and best practices.
              </p>
            </motion.div>

            <motion.div variants={item} className="text-center">
              <div className="mb-6">
                <Palette className="h-16 w-16 text-primary mx-auto" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Easy Customization</h3>
              <p className="text-muted-foreground">
                Beautiful components and design system that adapts to your brand.
              </p>
            </motion.div>

            <motion.div variants={item} className="text-center">
              <div className="mb-6">
                <Shield className="h-16 w-16 text-primary mx-auto" />
              </div>
              <h3 className="text-2xl font-semibold mb-4">Production Ready</h3>
              <p className="text-muted-foreground">
                Complete authentication, billing, and database setup out of the box.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Featured Projects Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Built With Modern Technologies</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powered by the most popular and reliable technologies in the ecosystem.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {projects.map((project, index) => (
              <motion.div key={index} variants={item}>
                <Card
                  className="h-full border-0 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 cursor-pointer group"
                  onClick={() => window.open(project.url, '_blank')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="mb-4 flex justify-center">
                      <Image
                        src={project.logo}
                        alt={`${project.name} logo`}
                        width={48}
                        height={48}
                        className="h-12 w-12 object-contain group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-2">{project.description}</p>
                    <Badge variant="outline" className="text-xs">
                      {project.category}
                    </Badge>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Get Started in Minutes</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Interactive setup guide walks you through everything step-by-step.
            </p>
          </motion.div>

          <motion.div
            className="max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="bg-card/50 backdrop-blur-sm border-0">
              <CardContent className="p-8">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <h3 className="text-2xl font-semibold mb-4">Interactive CLI Setup</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>Guides through creating necessary accounts</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>Configures all environment variables</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>Sets up production deployment</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span>Resume setup anytime</span>
                      </div>
                    </div>
                    <Button
                      className="mt-6"
                      onClick={() =>
                        window.open(
                          'https://github.com/filopedraz/kosuke-template/blob/main/cli/README.md',
                          '_blank'
                        )
                      }
                    >
                      View Setup Guide
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-6 font-mono text-sm">
                    <div className="text-muted-foreground mb-2">Terminal</div>
                    <div className="space-y-2">
                      <div>$ cd cli</div>
                      <div>$ pip install -r requirements.txt</div>
                      <div>$ python main.py</div>
                      <div className="text-green-500">✅ Interactive setup started...</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Perfect For Any Project</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Whether you&apos;re building a startup MVP or enterprise application.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {useCases.map((useCase, index) => (
              <motion.div
                key={index}
                variants={item}
                className="text-center p-6 rounded-lg bg-card/50 hover:bg-card/80 transition-colors"
              >
                <span className="font-medium">{useCase}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">
              Ready to Build Something Amazing?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join developers who trust Kosuke Template for their next project.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button
                className="px-6 py-3"
                onClick={() =>
                  window.open('https://github.com/filopedraz/kosuke-template', '_blank')
                }
              >
                <Star className="mr-2 h-4 w-4" />
                Star on GitHub
              </Button>
              <Button
                variant="outline"
                className="px-6 py-3"
                onClick={() =>
                  window.open(
                    'https://twitter.com/intent/tweet?text=Check%20out%20Kosuke%20Template%20-%20modern%20Next.js%20template%20with%20everything%20you%20need!&url=https://github.com/filopedraz/kosuke-template',
                    '_blank'
                  )
                }
              >
                <Twitter className="mr-2 h-4 w-4" />
                Share on X
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
