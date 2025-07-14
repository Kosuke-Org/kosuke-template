'use client';

import { motion, Variants } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { PRICING } from '@/lib/billing/utils';

export default function PricingPage() {
  const container: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item: Variants = {
    hidden: { y: 20, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
      },
    },
  };

  return (
    <div className="w-full flex flex-col items-center gap-8 font-[family-name:var(--font-geist-sans)]">
      <motion.h1
        className="text-3xl font-bold"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Pricing Plans
      </motion.h1>
      <motion.div
        className="grid gap-6 md:grid-cols-3 w-full max-w-5xl"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {Object.entries(PRICING).map(([tier, plan]) => (
          <motion.div key={tier} variants={item} whileHover={{ scale: 1.03 }}>
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4 flex-1">
                <div>
                  <div className="text-4xl font-bold">${plan.price}</div>
                  <div className="text-sm text-muted-foreground">per month</div>
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button className="mt-auto w-full">Select</Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
