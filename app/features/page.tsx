'use client';

import { motion } from 'framer-motion';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Zap, 
  Palette, 
  Shield, 
  Database, 
  Code, 
  Smartphone,
  Globe,
  Layers,
  Settings
} from 'lucide-react';

export default function FeaturesPage() {
  const features = [
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Lightning Fast",
      description: "Built with Next.js 15 and React 19 for optimal performance",
      badge: "Performance",
      color: "text-yellow-500"
    },
    {
      icon: <Palette className="h-8 w-8" />,
      title: "Beautiful Design",
      description: "Crafted with Shadcn UI and Tailwind CSS for stunning interfaces",
      badge: "Design",
      color: "text-purple-500"
    },
    {
      icon: <Code className="h-8 w-8" />,
      title: "TypeScript Ready",
      description: "Full TypeScript support with type safety throughout",
      badge: "Development",
      color: "text-blue-500"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Secure by Default",
      description: "Built-in security best practices and authentication",
      badge: "Security",
      color: "text-green-500"
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "Database Integration",
      description: "Postgres database with Drizzle ORM for data management",
      badge: "Backend",
      color: "text-orange-500"
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Mobile First",
      description: "Responsive design that works perfectly on all devices",
      badge: "Responsive",
      color: "text-pink-500"
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "API Routes",
      description: "Built-in API routes for seamless backend integration",
      badge: "Backend",
      color: "text-indigo-500"
    },
    {
      icon: <Layers className="h-8 w-8" />,
      title: "Component Library",
      description: "Extensive collection of reusable UI components",
      badge: "Components",
      color: "text-cyan-500"
    },
    {
      icon: <Settings className="h-8 w-8" />,
      title: "Easy Configuration",
      description: "Simple setup and customization for your needs",
      badge: "Setup",
      color: "text-red-500"
    }
  ];

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300 } },
  };

  return (
    <div className="min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <div className="max-w-6xl mx-auto">
        <Navbar />
        
        <motion.div 
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-12">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              Powerful Features
            </motion.h1>
            <motion.p 
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Discover the comprehensive set of features that make Kosuke Template 
              the perfect choice for your next project.
            </motion.p>
          </div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {features.map((feature, index) => (
              <motion.div key={index} variants={item}>
                <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <motion.div 
                        className={`${feature.color}`}
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {feature.icon}
                      </motion.div>
                      <Badge variant="secondary">{feature.badge}</Badge>
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="mt-16 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="bg-card border border-border rounded-lg p-8">
              <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
              <p className="text-muted-foreground mb-6">
                Experience the power of modern web development with our comprehensive template.
              </p>
              <motion.a
                href="https://github.com/filopedraz/kosuke-core"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium transition-colors hover:bg-primary/90"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                View on GitHub
              </motion.a>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}