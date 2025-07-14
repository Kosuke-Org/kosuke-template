'use client';

import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const pricingTiers = [
  {
    name: 'Starter',
    price: '$9',
    period: 'per month',
    description: 'Perfect for individuals and small projects',
    icon: Zap,
    features: [
      'Up to 5 projects',
      'Basic templates',
      'Community support',
      '1GB storage',
      'Standard integrations',
    ],
    buttonText: 'Get Started',
    buttonVariant: 'outline' as const,
    popular: false,
  },
  {
    name: 'Professional',
    price: '$29',
    period: 'per month',
    description: 'Best for growing teams and businesses',
    icon: Star,
    features: [
      'Unlimited projects',
      'Premium templates',
      'Priority support',
      '10GB storage',
      'Advanced integrations',
      'Custom branding',
      'Analytics dashboard',
    ],
    buttonText: 'Start Free Trial',
    buttonVariant: 'default' as const,
    popular: true,
  },
  {
    name: 'Enterprise',
    price: '$99',
    period: 'per month',
    description: 'For large organizations with advanced needs',
    icon: Crown,
    features: [
      'Everything in Professional',
      'Dedicated account manager',
      'Custom integrations',
      'Unlimited storage',
      'SSO authentication',
      'Advanced security',
      'API access',
      'White-label solution',
    ],
    buttonText: 'Contact Sales',
    buttonVariant: 'outline' as const,
    popular: false,
  },
];

export default function PricingPage() {
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
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24,
      },
    },
    hover: {
      y: -8,
      scale: 1.02,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 17,
      },
    },
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center py-12 px-4">
      <motion.div
        className="max-w-7xl w-full"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.div variants={itemVariants}>
            <Badge variant="secondary" className="mb-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mr-2"
              >
                <Star className="h-3 w-3" />
              </motion.div>
              Pricing
            </Badge>
          </motion.div>
          
          <motion.h1 
            className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
            variants={itemVariants}
          >
            Simple, Transparent Pricing
          </motion.h1>
          
          <motion.p 
            className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            variants={itemVariants}
          >
            Choose the perfect plan for your needs. Start for free, upgrade when you're ready.
          </motion.p>
        </div>

        {/* Pricing Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16"
          variants={containerVariants}
        >
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              variants={cardVariants}
              whileHover="hover"
              className="relative"
            >
              <Card className={`relative overflow-hidden transition-all duration-300 ${
                tier.popular ? 'ring-2 ring-primary shadow-lg' : ''
              }`}>
                {tier.popular && (
                  <motion.div
                    className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-sm font-medium"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 20% 100%)' }}
                    initial={{ x: 100 }}
                    animate={{ x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                  >
                    Most Popular
                  </motion.div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <motion.div 
                    className="flex justify-center mb-4"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                  >
                    <div className={`p-3 rounded-full ${
                      tier.popular ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    }`}>
                      <tier.icon className="h-6 w-6" />
                    </div>
                  </motion.div>
                  
                  <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                  <CardDescription className="text-sm">{tier.description}</CardDescription>
                  
                  <div className="flex items-baseline justify-center gap-1 mt-4">
                    <motion.span 
                      className="text-4xl font-bold"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 300 }}
                    >
                      {tier.price}
                    </motion.span>
                    <span className="text-sm text-muted-foreground">/{tier.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <Link href="/handler/sign-up" className="block mb-6">
                    <Button 
                      className="w-full" 
                      variant={tier.buttonVariant}
                      asChild
                    >
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        {tier.buttonText}
                      </motion.div>
                    </Button>
                  </Link>
                  
                  <Separator className="mb-6" />
                  
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <motion.li
                        key={feature}
                        className="flex items-start gap-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          delay: 0.5 + index * 0.1 + featureIndex * 0.05,
                          type: 'spring',
                          stiffness: 300 
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2, rotate: 360 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        </motion.div>
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* FAQ Section */}
        <motion.div 
          className="text-center max-w-4xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h2 
            className="text-3xl font-bold mb-8"
            variants={itemVariants}
          >
            Frequently Asked Questions
          </motion.h2>
          
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants}>
              <h3 className="font-semibold mb-2">Can I change my plan later?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, we offer a 14-day free trial for the Professional plan. No credit card required.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-muted-foreground text-sm">
                We accept all major credit cards, PayPal, and bank transfers for Enterprise plans.
              </p>
            </motion.div>
            
            <motion.div variants={itemVariants}>
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-muted-foreground text-sm">
                Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
              </p>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* CTA Section */}
        <motion.div 
          className="text-center mt-16 p-8 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, type: 'spring', stiffness: 200 }}
        >
          <motion.h2 
            className="text-2xl font-bold mb-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            Ready to get started?
          </motion.h2>
          
          <motion.p 
            className="text-muted-foreground mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
          >
            Join thousands of developers who trust Kosuke for their projects.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.6, type: 'spring', stiffness: 200 }}
          >
            <Link href="/handler/sign-up">
              <Button size="lg" className="mr-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  Start Free Trial
                </motion.div>
              </Button>
            </Link>
            
            <Link href="/handler/sign-in">
              <Button variant="outline" size="lg">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  Sign In
                </motion.div>
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}