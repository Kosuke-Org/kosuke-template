'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Star, Zap, Shield, Palette } from 'lucide-react';

export default function Features() {
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

  const features = [
    {
      icon: <Zap className="h-8 w-8 text-yellow-500" />,
      title: "Lightning Fast",
      description: "Built with Next.js 15 and React 19 for optimal performance",
      status: "completed"
    },
    {
      icon: <Palette className="h-8 w-8 text-blue-500" />,
      title: "Modern Design System",
      description: "Powered by shadcn/ui components and TailwindCSS",
      status: "completed"
    },
    {
      icon: <Shield className="h-8 w-8 text-green-500" />,
      title: "Type Safety",
      description: "Full TypeScript support with strict type checking",
      status: "completed"
    },
    {
      icon: <Star className="h-8 w-8 text-purple-500" />,
      title: "Backend Integration",
      description: "Postgres database with Drizzle ORM and Next.js APIs",
      status: "planned"
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1
          className="text-4xl font-bold mb-4"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          Features
        </motion.h1>
        <motion.p
          className="text-xl text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Discover what makes Kosuke Template special
        </motion.p>
      </motion.div>

      <motion.div
        className="grid md:grid-cols-2 gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="border border-border rounded-lg p-6 bg-card hover:shadow-lg transition-shadow"
            variants={item}
            whileHover={{ y: -5 }}
          >
            <div className="flex items-start space-x-4">
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ duration: 0.2 }}
              >
                {feature.icon}
              </motion.div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  {feature.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="mt-12 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <motion.p
          className="text-lg text-muted-foreground"
          whileHover={{ scale: 1.05 }}
        >
          More features coming soon...
        </motion.p>
      </motion.div>
    </div>
  );
}