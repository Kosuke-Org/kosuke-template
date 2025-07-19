'use client';

import {
  Github,
  Star,
  Zap,
  Rocket,
  Shield,
  Palette,
  ArrowRight,
  Play,
  Sparkles,
} from 'lucide-react';
import { TechLogo } from './components/TechCard';
import { technologies } from './data/technologies';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

// Modern features with better descriptions
const modernFeatures = [
  {
    icon: Rocket,
    title: 'Next.js 15 Ready',
    description: 'Built on the latest App Router with React 19 and Server Components.',
    highlight: 'Latest',
    color: 'from-blue-500 to-purple-600',
  },
  {
    icon: Shield,
    title: 'Auth & Security',
    description: 'Complete Clerk integration with social logins and user management.',
    highlight: 'Secure',
    color: 'from-green-500 to-emerald-600',
  },
  {
    icon: Palette,
    title: 'Design System',
    description: 'Shadcn UI components with Tailwind CSS for beautiful interfaces.',
    highlight: 'Beautiful',
    color: 'from-orange-500 to-red-600',
  },
  {
    icon: Zap,
    title: 'Subscription Ready',
    description: 'Polar billing integration for seamless payment processing.',
    highlight: 'Revenue',
    color: 'from-purple-500 to-pink-600',
  },
];

export default function HomePage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();
  const heroOffset = useTransform(scrollY, [0, 300], [0, -50]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0.3]);

  useEffect(() => {
    setIsVisible(true);
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 10,
      },
    },
  };

  return (
    <div className="w-full min-h-screen font-[family-name:var(--font-geist-sans)] overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
        <motion.div
          className="absolute w-96 h-96 bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-full blur-3xl"
          animate={{
            x: mousePosition.x / 50,
            y: mousePosition.y / 50,
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 30 }}
          style={{
            left: '10%',
            top: '20%',
          }}
        />
        <motion.div
          className="absolute w-64 h-64 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"
          animate={{
            x: -mousePosition.x / 30,
            y: -mousePosition.y / 30,
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 30 }}
          style={{
            right: '10%',
            bottom: '20%',
          }}
        />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6">
        <motion.div
          className="text-center max-w-6xl mx-auto"
          style={{ y: heroOffset, opacity: heroOpacity }}
        >
          <AnimatePresence>
            {isVisible && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <Badge
                  variant="secondary"
                  className="mb-6 px-4 py-2 text-sm bg-primary/10 border-primary/20 hover:bg-primary/20 transition-colors"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Production-ready Next.js template
                </Badge>

                <motion.h1
                  className="text-6xl lg:text-8xl font-bold mb-8 leading-tight"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                >
                  <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent bg-size-200 animate-gradient-x">
                    Build
                  </span>{' '}
                  <br />
                  <span className="text-muted-foreground">Extraordinary</span>
                  <br />
                  <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                    Apps
                  </span>
                </motion.h1>

                <motion.p
                  className="text-xl lg:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                >
                  The most complete Next.js template with authentication, billing, database, and
                  everything you need to ship fast.
                </motion.p>

                <motion.div
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.8 }}
                >
                  <Button
                    size="lg"
                    className="px-8 py-4 text-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                    onClick={() =>
                      window.open('https://github.com/filopedraz/kosuke-template', '_blank')
                    }
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Get Started
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 py-4 text-lg backdrop-blur-sm hover:bg-primary/10 transition-all duration-300"
                    onClick={() =>
                      window.open('https://github.com/filopedraz/kosuke-template', '_blank')
                    }
                  >
                    <Github className="mr-2 h-5 w-5" />
                    View on GitHub
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Bento Features Section */}
      <section className="py-32 px-6">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl lg:text-6xl font-bold mb-6">
              Everything You Need,{' '}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Nothing You Don&apos;t
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Carefully crafted components and integrations that work together seamlessly.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {modernFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                className={`${
                  index === 0 ? 'md:col-span-2' : ''
                } ${index === 3 ? 'lg:col-span-2' : ''}`}
              >
                <Card className="h-full border-0 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-500 group overflow-hidden relative">
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}
                  />
                  <CardContent className="p-8 relative">
                    <div className="flex items-start justify-between mb-6">
                      <div
                        className={`p-3 rounded-2xl bg-gradient-to-br ${feature.color} shadow-lg`}
                      >
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20"
                      >
                        {feature.highlight}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-semibold mb-4 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Powered by Industry Leaders</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built with the most trusted technologies. Click any logo to explore their docs.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-3 md:grid-cols-6 lg:grid-cols-7 gap-8 max-w-6xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {technologies.map((tech, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                className="flex flex-col items-center space-y-3 group"
                whileHover={{ y: -5 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 group-hover:border-primary/30 group-hover:bg-card/80 transition-all duration-300 cursor-pointer">
                  <TechLogo name={tech.name} logoPath={tech.logoPath} url={tech.url} size="md" />
                </div>
                <span className="text-sm font-medium text-center opacity-60 group-hover:opacity-100 transition-opacity">
                  {tech.name}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl lg:text-6xl font-bold mb-8">
              Ready to{' '}
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Ship Fast?
              </span>
            </h2>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              Join thousands of developers building the next generation of web applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button
                size="lg"
                className="px-10 py-4 text-lg bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 border-0 shadow-lg hover:shadow-xl transition-all duration-300 group"
                onClick={() =>
                  window.open('https://github.com/filopedraz/kosuke-template', '_blank')
                }
              >
                <Star className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                Star on GitHub
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-10 py-4 text-lg backdrop-blur-sm hover:bg-primary/10 transition-all duration-300"
                onClick={() =>
                  window.open(
                    'https://github.com/filopedraz/kosuke-template/blob/main/cli/README.md',
                    '_blank'
                  )
                }
              >
                Setup Guide
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
