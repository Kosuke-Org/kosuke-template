'use client';

import { motion, type Variants } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Starter',
    price: '$0',
    description: 'Perfect to get started',
    features: ['1 project', 'Community support'],
  },
  {
    name: 'Pro',
    price: '$9',
    description: 'For growing teams',
    features: ['Unlimited projects', 'Priority support', 'Advanced analytics'],
  },
  {
    name: 'Enterprise',
    price: '$29',
    description: 'Best for large organizations',
    features: ['Unlimited projects', 'Dedicated support', 'Custom integrations'],
  },
];

export default function PricingPage() {
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
      transition: { type: 'spring', stiffness: 300 },
    },
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center text-center"
      >
        <motion.h1
          className="text-4xl font-bold mb-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Pricing
        </motion.h1>
        <motion.p
          className="text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Choose the plan that best fits your needs
        </motion.p>
      </motion.div>

      <motion.div
        className="grid gap-6 w-full max-w-5xl md:grid-cols-3"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {plans.map((plan) => (
          <motion.div
            key={plan.name}
            variants={item}
            whileHover={{ translateY: -4, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
            className="flex flex-col rounded-xl border bg-card p-6"
          >
            <h2 className="text-xl font-semibold mb-1">{plan.name}</h2>
            <p className="text-4xl font-extrabold mb-2">{plan.price}</p>
            <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
            <ul className="space-y-2 flex-1 text-left">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start">
                  <CheckCircle2 className="h-5 w-5 mr-2 text-green-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Button className="mt-6" variant="secondary">
              Get Started
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
